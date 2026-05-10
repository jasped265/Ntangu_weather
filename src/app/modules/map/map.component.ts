import {
  AfterViewInit,
  Component,
  OnDestroy,
  ChangeDetectorRef,
} from '@angular/core';
import * as L from 'leaflet';
import {
  WeatherService,
  MapMarker,
} from '../../shared/services/weather.service';
import { LocationStoreService } from '../../shared/services/location-store.service';
import { I18nService, UnitsService } from '../../shared/services/theme.service';
import { Subject, takeUntil } from 'rxjs';
import { WeatherData } from '../../shared/models/weather.model';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
})
export class MapComponent implements AfterViewInit, OnDestroy {
  readonly Math = Math;

  layers = [
    {
      id: 'wind',
      labelKey: 'map.layer_wind',
      icon: 'air',
      active: true,
      color: 'var(--primary)',
    },
    {
      id: 'temp',
      labelKey: 'map.layer_temp',
      icon: 'thermostat',
      active: false,
      color: 'var(--tertiary)',
    },
    {
      id: 'rain',
      labelKey: 'map.layer_rain',
      icon: 'rainy',
      active: false,
      color: 'var(--secondary)',
    },
    {
      id: 'cloud',
      labelKey: 'map.layer_cloud',
      icon: 'cloud',
      active: false,
      color: 'var(--on-surface-variant)',
    },
  ];

  selectedTime = '18:00';
  times = ['18:00', '12:00', '15:00', '18:00', '21:00', '00:00', '03:00'];
  precision = 75;

  markers: MapMarker[] = [];
  selectedMarker: MapMarker | null = null;
  currentWeather: WeatherData | null = null;

  isPlaying = false;
  timelinePercent = 0;
  currentDayLabel = '';
  private playInterval?: any;
  private currentTimeIndex = 0;

  private map?: L.Map;
  private readonly destroy$ = new Subject<void>();
  private readonly markerLayer = L.layerGroup();
  private readonly windLayer = L.layerGroup();
  private owmLayers: Record<string, L.TileLayer> = {};
  private readonly owmKey = '3d4abe3086fc0011049889f6a0bd5652';
  private searchPin?: L.Marker;

  constructor(
    private weather: WeatherService,
    private locationStore: LocationStoreService,
    public i18n: I18nService,
    public units: UnitsService,
    private cdr: ChangeDetectorRef,
  ) {
    // Inicializar aqui garante que i18n já está injetado —
    // evita que o campo comece como '' e mude no primeiro check (NG0100).
    this.currentDayLabel = this.computeDayLabel(this.i18n.currentLang);
  }

  ngAfterViewInit(): void {
    this.initMap();
    this.loadMarkers();

    // FIX NG0100: adiar mutações de estado para fora do ciclo AfterViewInit
    setTimeout(() => {
      this.updateDayLabel();
      this.seekToCurrentTime();
      this.cdr.detectChanges();
    }, 0);

    this.locationStore.selected$
      .pipe(takeUntil(this.destroy$))
      .subscribe((loc) => {
        if (!loc?.name) return;
        this.weather.getCurrentWeather(loc.name).subscribe((w) => {
          this.currentWeather = w;
          if (this.map && w.lat && w.lon) {
            this.map.setView([w.lat, w.lon], Math.max(this.map.getZoom(), 7), {
              animate: true,
            });

            if (this.searchPin) {
              this.map.removeLayer(this.searchPin);
            }

            const tempDisplay = `${this.units.convert(Math.round(w.temperature))}${this.units.symbol}`;

            this.searchPin = L.marker([w.lat, w.lon], {
              icon: L.divIcon({
                className: '',
                html: `
                  <div style="display:flex;flex-direction:column;align-items:center;">
                    <div style="
                      background:var(--primary,#bec5e4);
                      color:#0a1229;
                      font-family:'Space Grotesk',sans-serif;
                      font-size:12px;
                      font-weight:700;
                      padding:4px 10px;
                      border-radius:20px;
                      white-space:nowrap;
                      box-shadow:0 2px 12px rgba(0,0,0,0.4);
                    ">${w.city}, ${w.country} · ${tempDisplay}</div>
                    <div style="width:2px;height:12px;background:var(--primary,#bec5e4);"></div>
                    <div style="
                      width:12px;height:12px;border-radius:50%;
                      background:var(--primary,#bec5e4);
                      box-shadow:0 0 10px rgba(190,197,228,0.8);
                    "></div>
                  </div>
                `,
                iconAnchor: [40, 40],
              }),
            }).addTo(this.map);

            this.selectedMarker = {
              id: 0,
              name: w.city,
              country: w.country,
              lat: w.lat,
              lon: w.lon,
              temp: w.temperature,
              condition: w.condition,
              wind_kph: w.windSpeed,
              wind_dir: w.windDirection,
            };
          }
        });
        const found = this.markers.find(
          (m) => m.name.toLowerCase() === loc.name.toLowerCase(),
        );
        if (found) this.focusMarker(found, false);
      });

    this.units.unit$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.renderMarkers();
      this.cdr.markForCheck();
    });

    this.i18n.lang$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.updateDayLabel();
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    clearInterval(this.playInterval);
    if (this.map) {
      this.map.remove();
      this.map = undefined;
    }
  }

  toggleLayer(layer: any): void {
    layer.active = !layer.active;
    const tile = this.owmLayers[layer.id];
    if (tile) {
      if (layer.active) {
        tile.addTo(this.map!);
      } else {
        this.map!.removeLayer(tile);
      }
    }
    this.renderMarkers();
  }

  togglePlay(): void {
    this.isPlaying = !this.isPlaying;
    if (this.isPlaying) {
      this.playInterval = setInterval(() => {
        this.currentTimeIndex = (this.currentTimeIndex + 1) % this.times.length;
        this.seekToIndex(this.currentTimeIndex);
      }, 1500);
    } else {
      clearInterval(this.playInterval);
    }
  }

  seekToIndex(index: number): void {
    this.currentTimeIndex = index;
    this.selectedTime = this.times[index];
    this.timelinePercent = (index / (this.times.length - 1)) * 100;
    this.updateDayLabel();
  }

  onTrackMouseDown(event: MouseEvent): void {
    this.scrubFromEvent(event.clientX, event.currentTarget as HTMLElement);
    const move = (e: MouseEvent) =>
      this.scrubFromEvent(e.clientX, event.currentTarget as HTMLElement);
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }

  onTrackTouch(event: TouchEvent): void {
    this.scrubFromEvent(
      event.touches[0].clientX,
      event.currentTarget as HTMLElement,
    );
    const move = (e: TouchEvent) =>
      this.scrubFromEvent(
        e.touches[0].clientX,
        event.currentTarget as HTMLElement,
      );
    const end = () => {
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', end);
    };
    window.addEventListener('touchmove', move);
    window.addEventListener('touchend', end);
  }

  private scrubFromEvent(clientX: number, track: HTMLElement): void {
    const rect = track.getBoundingClientRect();
    const percent = Math.max(
      0,
      Math.min(1, (clientX - rect.left) / rect.width),
    );
    const index = Math.round(percent * (this.times.length - 1));
    this.seekToIndex(index);
  }

  // Método puro — não depende de `this.i18n` para poder ser chamado
  // na inicialização do campo (antes do constructor injetar os serviços).
  // Para reatividade usa updateDayLabel() que chama este método.
  computeDayLabel(lang?: string): string {
    const now = new Date();
    const useLang =
      lang ?? (typeof this.i18n !== 'undefined' ? this.i18n.currentLang : 'pt');
    const days =
      useLang === 'en'
        ? [
            'SUNDAY',
            'MONDAY',
            'TUESDAY',
            'WEDNESDAY',
            'THURSDAY',
            'FRIDAY',
            'SATURDAY',
          ]
        : [
            'DOMINGO',
            'SEGUNDA-FEIRA',
            'TERÇA-FEIRA',
            'QUARTA-FEIRA',
            'QUINTA-FEIRA',
            'SEXTA-FEIRA',
            'SÁBADO',
          ];
    return days[now.getDay()];
  }

  private updateDayLabel(): void {
    this.currentDayLabel = this.computeDayLabel(this.i18n.currentLang);
  }

  private seekToCurrentTime(): void {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();

    let closestIndex = 0;
    let smallestDiff = Infinity;
    this.times.forEach((t, i) => {
      const [h, m] = t.split(':').map(Number);
      const diff = Math.abs(
        currentHour * 60 + currentMinutes - (h * 60 + (m || 0)),
      );
      if (diff < smallestDiff) {
        smallestDiff = diff;
        closestIndex = i;
      }
    });

    this.seekToIndex(closestIndex);
  }

  private initMap(): void {
    const start = this.locationStore.selected;
    const startLat = start.lat ?? -8.839;
    const startLon = start.lon ?? 13.2894;

    this.map = L.map('leaflet-map', {
      zoomControl: false,
      attributionControl: false,
    }).setView([startLat, startLon], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(this.map);

    L.control.zoom({ position: 'topright' }).addTo(this.map);

    this.markerLayer.addTo(this.map);
    this.windLayer.addTo(this.map);

    this.owmLayers = {
      wind: L.tileLayer(
        `https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${this.owmKey}`,
        { opacity: 0.6, maxZoom: 19 },
      ),
      temp: L.tileLayer(
        `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${this.owmKey}`,
        { opacity: 0.6, maxZoom: 19 },
      ),
      rain: L.tileLayer(
        `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${this.owmKey}`,
        { opacity: 0.6, maxZoom: 19 },
      ),
      cloud: L.tileLayer(
        `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${this.owmKey}`,
        { opacity: 0.6, maxZoom: 19 },
      ),
    };

    this.layers.forEach((l) => {
      if (l.active) this.owmLayers[l.id]?.addTo(this.map!);
    });

    this.map.on('click', () => {
      this.selectedMarker = null;
    });
  }

  private loadMarkers(): void {
    this.weather
      .getMapMarkers()
      .pipe(takeUntil(this.destroy$))
      .subscribe((markers) => {
        this.markers = markers || [];
        this.renderMarkers();

        const sel = this.locationStore.selected?.name;
        if (sel) {
          const found = this.markers.find(
            (m) => m.name.toLowerCase() === sel.toLowerCase(),
          );
          if (found) this.focusMarker(found, false);
        }
      });
  }

  private renderMarkers(): void {
    this.markerLayer.clearLayers();
    this.windLayer.clearLayers();

    for (const m of this.markers) {
      const temp = typeof m.temp === 'number' ? m.temp : null;
      const color =
        temp === null
          ? '#909098'
          : temp >= 30
            ? '#edc225'
            : temp >= 20
              ? '#bec5e4'
              : '#b9c3ff';

      const circle = L.circleMarker([m.lat, m.lon], {
        radius: 8,
        color,
        weight: 2,
        fillColor: color,
        fillOpacity: 0.25,
      });

      circle.on('click', () => this.focusMarker(m, true));

      const tempLabel =
        temp !== null
          ? ` · ${this.units.convert(Math.round(temp))}${this.units.symbol}`
          : '';
      circle.bindPopup(`${m.name}${tempLabel}`, { closeButton: false });
      circle.addTo(this.markerLayer);

      if (this.isLayerActive('wind') && m.wind_kph != null && m.wind_dir) {
        const line = this.windVector(
          [m.lat, m.lon],
          Number(m.wind_kph),
          String(m.wind_dir),
        );
        if (line) line.addTo(this.windLayer);
      }
    }
  }

  private focusMarker(m: MapMarker, updateLocation: boolean): void {
    this.selectedMarker = m;
    if (this.map) {
      this.map.setView([m.lat, m.lon], Math.max(this.map.getZoom(), 7), {
        animate: true,
      });
    }
    if (updateLocation) {
      this.locationStore.setLocation({
        name: m.name,
        region: '',
        country: m.country,
        lat: m.lat,
        lon: m.lon,
      });
    }
    this.weather
      .getCurrentWeather(m.name)
      .subscribe((w) => (this.currentWeather = w));
  }

  private isLayerActive(id: string): boolean {
    return !!this.layers.find((l) => l.id === id && l.active);
  }

  private windVector(
    origin: [number, number],
    windKph: number,
    windDir: string,
  ): L.Polyline | null {
    const bearing = this.windDirToBearing(windDir);
    if (bearing === null) return null;

    const lengthMeters = Math.min(20000, Math.max(2000, windKph * 200));
    const dest = this.destination(origin[0], origin[1], bearing, lengthMeters);
    return L.polyline([origin, dest], {
      color: 'rgba(185,195,255,0.65)',
      weight: 2,
    });
  }

  private windDirToBearing(dir: string): number | null {
    const d = dir.toUpperCase().trim();
    const map: Record<string, number> = {
      N: 0,
      NNE: 22.5,
      NE: 45,
      ENE: 67.5,
      E: 90,
      ESE: 112.5,
      SE: 135,
      SSE: 157.5,
      S: 180,
      SSW: 202.5,
      SW: 225,
      WSW: 247.5,
      W: 270,
      WNW: 292.5,
      NW: 315,
      NNW: 337.5,
    };
    return map[d] ?? null;
  }

  private destination(
    lat: number,
    lon: number,
    bearingDeg: number,
    distanceMeters: number,
  ): [number, number] {
    const R = 6371000;
    const brng = (bearingDeg * Math.PI) / 180;
    const φ1 = (lat * Math.PI) / 180;
    const λ1 = (lon * Math.PI) / 180;
    const δ = distanceMeters / R;

    const φ2 = Math.asin(
      Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(brng),
    );
    const λ2 =
      λ1 +
      Math.atan2(
        Math.sin(brng) * Math.sin(δ) * Math.cos(φ1),
        Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2),
      );

    return [(φ2 * 180) / Math.PI, (((λ2 * 180) / Math.PI + 540) % 360) - 180];
  }
}

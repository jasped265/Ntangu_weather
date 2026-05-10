import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  ViewChild,
  ChangeDetectorRef,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { I18nService, UnitsService } from '../../shared/services/theme.service';
import { Subject, takeUntil } from 'rxjs';

interface DayData {
  date: string;
  label: string;
  dayLabel: string;
  tempMax: number;
  tempMin: number;
  humidity: number;
  wind: number;
  rainfall: number;
  condition: string;
  icon: string;
}

interface MonthData {
  month: string;
  avgTemp: number;
  totalRain: number;
  avgHumidity: number;
  avgWind: number;
}

interface CityCoords {
  name: string;
  lat: number;
  lon: number;
}

@Component({
  selector: 'app-history',
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.scss'],
})
export class HistoryComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('tempCanvas') tempCanvasRef!: ElementRef<HTMLCanvasElement>;

  activeTab: 'temperatura' | 'chuva' | 'humidade' | 'vento' = 'temperatura';
  activeRange: '30d' | '90d' | '1a' | '5a' = '30d';
  selectedCity: CityCoords = { name: 'Luanda', lat: -8.84, lon: 13.23 };
  isLoading = false;
  hasError = false;
  showCityDropdown = false;

  cities: CityCoords[] = [
    { name: 'Luanda', lat: -8.84, lon: 13.23 },
    { name: 'Benguela', lat: -12.57, lon: 13.4 },
    { name: 'Huambo', lat: -12.77, lon: 15.74 },
    { name: 'Lubango', lat: -14.92, lon: 13.49 },
    { name: 'Namibe', lat: -15.19, lon: 12.15 },
    { name: 'Malanje', lat: -9.54, lon: 16.34 },
    { name: 'Cabinda', lat: -5.55, lon: 12.19 },
  ];

  /** Tab labels come from i18n — rebuilt in refreshTabs() on lang change */
  tabs!: {
    key: 'temperatura' | 'chuva' | 'humidade' | 'vento';
    label: string;
    icon: string;
    unit: string;
    color: string;
  }[];

  /** Range labels come from i18n */
  ranges!: { key: '30d' | '90d' | '1a' | '5a'; label: string }[];

  dailyData: DayData[] = [];
  monthlyData: MonthData[] = [];

  private observer!: ResizeObserver;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private http: HttpClient,
    public i18n: I18nService,
    public units: UnitsService,
    private cdr: ChangeDetectorRef,
  ) {
    this.refreshTabs();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private refreshTabs(): void {
    this.tabs = [
      {
        key: 'temperatura',
        label: this.i18n.t('history.tab_temp'),
        icon: 'thermostat',
        unit: '°C',
        color: '#bec5e4',
      },
      {
        key: 'chuva',
        label: this.i18n.t('history.tab_rain'),
        icon: 'water_drop',
        unit: 'mm',
        color: '#b9c3ff',
      },
      {
        key: 'humidade',
        label: this.i18n.t('history.tab_humidity'),
        icon: 'humidity_percentage',
        unit: '%',
        color: '#edc225',
      },
      {
        key: 'vento',
        label: this.i18n.t('history.tab_wind'),
        icon: 'air',
        unit: 'km/h',
        color: '#bec5e4',
      },
    ];
    this.ranges = [
      { key: '30d', label: this.i18n.t('history.range_30d') },
      { key: '90d', label: this.i18n.t('history.range_90d') },
      { key: '1a', label: this.i18n.t('history.range_1y') },
      { key: '5a', label: this.i18n.t('history.range_5y') },
    ];
  }

  get currentTab() {
    return this.tabs.find((t) => t.key === this.activeTab)!;
  }

  /** For temperature tab the unit follows UnitsService; others are fixed */
  get currentUnit(): string {
    if (this.activeTab === 'temperatura') return this.units.symbol;
    return this.currentTab.unit;
  }

  get stats() {
    const d = this.dailyData;
    if (!d.length) return { max: 0, min: 0, avg: 0, total: 0 };
    const key =
      this.activeTab === 'temperatura'
        ? 'tempMax'
        : this.activeTab === 'chuva'
          ? 'rainfall'
          : this.activeTab === 'humidade'
            ? 'humidity'
            : 'wind';
    const vals = d.map((x) => (x as any)[key] as number);
    const rawMax = Math.max(...vals);
    const rawMin = Math.min(...vals);
    const rawAvg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const total = Math.round(vals.reduce((a, b) => a + b, 0));

    if (this.activeTab === 'temperatura') {
      return {
        max: this.units.convert(rawMax),
        min: this.units.convert(rawMin),
        avg: this.units.convert(Math.round(rawAvg)),
        total,
      };
    }
    return { max: rawMax, min: rawMin, avg: Math.round(rawAvg), total };
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.fetchData();

    this.i18n.lang$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.refreshTabs(); // rebuild translated tab/range labels
      this.buildMonthlyData(); // rebuild month names in the right language
      this.cdr.markForCheck();
    });

    this.units.unit$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.cdr.markForCheck();
      setTimeout(() => this.drawChart(), 60);
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.drawChart(), 100);
    this.observer = new ResizeObserver(() => this.drawChart());
    const parent = this.tempCanvasRef?.nativeElement?.parentElement;
    if (parent) this.observer.observe(parent);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Date helpers ──────────────────────────────────────────────────────────

  private getDateRange(): { start: string; end: string } {
    const end = new Date();
    end.setDate(end.getDate() - 1);
    const start = new Date(end);
    if (this.activeRange === '30d') start.setDate(start.getDate() - 29);
    if (this.activeRange === '90d') start.setDate(start.getDate() - 89);
    if (this.activeRange === '1a') start.setFullYear(start.getFullYear() - 1);
    if (this.activeRange === '5a') start.setFullYear(start.getFullYear() - 5);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  }

  private locale(): string {
    return this.i18n.currentLang === 'pt' ? 'pt-AO' : 'en-GB';
  }

  private fmt(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString(this.locale(), {
      day: '2-digit',
      month: 'short',
    });
  }

  private fmtDay(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString(this.locale(), { weekday: 'short' });
  }

  private conditionFromRain(
    rain: number,
    tempMax: number,
  ): { condition: string; icon: string } {
    if (rain > 10)
      return { condition: this.i18n.t('history.cond_rainy'), icon: 'rainy' };
    if (rain > 2)
      return { condition: this.i18n.t('history.cond_shower'), icon: 'rainy' };
    if (tempMax > 30)
      return { condition: this.i18n.t('history.cond_sunny'), icon: 'wb_sunny' };
    return { condition: this.i18n.t('history.cond_cloudy'), icon: 'cloud' };
  }

  /** Month abbreviations in the active language */
  private monthNames(): string[] {
    return this.i18n.currentLang === 'pt'
      ? [
          'Jan',
          'Fev',
          'Mar',
          'Abr',
          'Mai',
          'Jun',
          'Jul',
          'Ago',
          'Set',
          'Out',
          'Nov',
          'Dez',
        ]
      : [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec',
        ];
  }

  // ── API ───────────────────────────────────────────────────────────────────

  fetchData(): void {
    this.isLoading = true;
    this.hasError = false;
    this.dailyData = [];

    const { start, end } = this.getDateRange();
    const { lat, lon } = this.selectedCity;

    const url =
      `https://archive-api.open-meteo.com/v1/archive` +
      `?latitude=${lat}&longitude=${lon}` +
      `&start_date=${start}&end_date=${end}` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max` +
      `&hourly=relative_humidity_2m` +
      `&timezone=Africa%2FLuanda`;

    this.http.get<any>(url).subscribe({
      next: (res) => {
        const d = res.daily;
        const h = res.hourly;

        const humidityByDay = new Map<string, number[]>();
        (h.time as string[]).forEach((t, i) => {
          const day = t.split('T')[0];
          if (!humidityByDay.has(day)) humidityByDay.set(day, []);
          const val = h.relative_humidity_2m[i];
          if (val != null) humidityByDay.get(day)!.push(val);
        });

        this.dailyData = (d.time as string[]).map((date, i) => {
          const rain = d.precipitation_sum[i] ?? 0;
          const tempMax = d.temperature_2m_max[i] ?? 0;
          const tempMin = d.temperature_2m_min[i] ?? 0;
          const wind = d.wind_speed_10m_max[i] ?? 0;
          const humVals = humidityByDay.get(date) ?? [];
          const humidity = humVals.length
            ? Math.round(humVals.reduce((a, b) => a + b, 0) / humVals.length)
            : 0;
          const { condition, icon } = this.conditionFromRain(rain, tempMax);
          return {
            date,
            label: this.fmt(date),
            dayLabel: this.fmtDay(date),
            tempMax: Math.round(tempMax),
            tempMin: Math.round(tempMin),
            humidity,
            wind: Math.round(wind),
            rainfall: Math.round(rain * 10) / 10,
            condition,
            icon,
          };
        });

        this.buildMonthlyData();
        this.isLoading = false;
        setTimeout(() => this.drawChart(), 80);
      },
      error: () => {
        this.isLoading = false;
        this.hasError = true;
      },
    });
  }

  // ── Monthly aggregation ───────────────────────────────────────────────────

  buildMonthlyData(): void {
    const map = new Map<
      string,
      { temps: number[]; rain: number[]; hum: number[]; wind: number[] }
    >();
    const names = this.monthNames();

    for (const d of this.dailyData) {
      const key = d.date.substring(0, 7);
      if (!map.has(key))
        map.set(key, { temps: [], rain: [], hum: [], wind: [] });
      const m = map.get(key)!;
      m.temps.push(d.tempMax);
      m.rain.push(d.rainfall);
      m.hum.push(d.humidity);
      m.wind.push(d.wind);
    }

    this.monthlyData = Array.from(map.entries()).map(([key, v]) => ({
      month:
        names[parseInt(key.split('-')[1]) - 1] +
        " '" +
        key.split('-')[0].slice(2),
      avgTemp: Math.round(v.temps.reduce((a, b) => a + b, 0) / v.temps.length),
      totalRain: Math.round(v.rain.reduce((a, b) => a + b, 0)),
      avgHumidity: Math.round(v.hum.reduce((a, b) => a + b, 0) / v.hum.length),
      avgWind: Math.round(v.wind.reduce((a, b) => a + b, 0) / v.wind.length),
    }));
  }

  // ── UI ────────────────────────────────────────────────────────────────────

  selectTab(tab: typeof this.activeTab): void {
    this.activeTab = tab;
    setTimeout(() => this.drawChart(), 60);
  }

  selectRange(r: typeof this.activeRange): void {
    this.activeRange = r;
    this.fetchData();
  }

  selectCity(city: CityCoords): void {
    this.selectedCity = city;
    this.showCityDropdown = false;
    this.fetchData();
  }

  retry(): void {
    this.fetchData();
  }

  // ── Canvas ────────────────────────────────────────────────────────────────

  private getCSSVar(name: string): string {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
  }

  drawChart(): void {
    const canvasRef = this.tempCanvasRef;
    if (!canvasRef) return;
    const canvas = canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const container = canvas.parentElement!;
    const dpr = window.devicePixelRatio || 1;
    const W = container.clientWidth;
    const H = container.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const colorMap: Record<string, string> = {
      temperatura: this.getCSSVar('--primary') || '#bec5e4',
      chuva: this.getCSSVar('--secondary') || '#b9c3ff',
      humidade: this.getCSSVar('--tertiary') || '#edc225',
      vento: this.getCSSVar('--primary') || '#bec5e4',
    };
    const lineColor = colorMap[this.activeTab];
    const outline = this.getCSSVar('--outline-variant') || '#45464d';
    const onSurface = this.getCSSVar('--on-surface-variant') || '#c6c6ce';

    const pad = { top: 24, right: 24, bottom: 52, left: 52 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;

    const key =
      this.activeTab === 'temperatura'
        ? 'tempMax'
        : this.activeTab === 'chuva'
          ? 'rainfall'
          : this.activeTab === 'humidade'
            ? 'humidity'
            : 'wind';

    let points: { label: string; value: number }[] = [];
    if (this.activeRange === '1a' || this.activeRange === '5a') {
      points = this.monthlyData.map((m) => ({
        label: m.month,
        value:
          key === 'tempMax'
            ? this.activeTab === 'temperatura'
              ? this.units.convert(m.avgTemp)
              : m.avgTemp
            : key === 'rainfall'
              ? m.totalRain
              : key === 'humidity'
                ? m.avgHumidity
                : m.avgWind,
      }));
    } else {
      points = this.dailyData.map((d) => ({
        label: d.label,
        value:
          this.activeTab === 'temperatura'
            ? this.units.convert((d as any)[key] as number)
            : ((d as any)[key] as number),
      }));
    }

    if (!points.length) return;

    const vals = points.map((p) => p.value);
    const minVal = Math.min(...vals) * 0.92;
    const maxVal = Math.max(...vals) * 1.06;
    const range = maxVal - minVal || 1;
    const xStep = chartW / Math.max(vals.length - 1, 1);
    const toX = (i: number) => pad.left + i * xStep;
    const toY = (v: number) =>
      pad.top + chartH - ((v - minVal) / range) * chartH;

    // Grid lines
    ctx.strokeStyle = outline;
    ctx.lineWidth = 0.5;
    ctx.setLineDash([4, 4]);
    for (let g = 0; g <= 4; g++) {
      const y = pad.top + (chartH / 4) * g;
      const val = Math.round(maxVal - (range / 4) * g);
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(W - pad.right, y);
      ctx.stroke();
      ctx.fillStyle = onSurface;
      ctx.font = '11px "Space Grotesk", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(String(val), pad.left - 8, y + 4);
    }
    ctx.setLineDash([]);

    // Area fill
    const grad = ctx.createLinearGradient(0, pad.top, 0, H - pad.bottom);
    grad.addColorStop(0, lineColor + '33');
    grad.addColorStop(1, lineColor + '00');

    ctx.beginPath();
    ctx.moveTo(toX(0), toY(vals[0]));
    for (let i = 1; i < vals.length; i++) {
      const cpx = (toX(i - 1) + toX(i)) / 2;
      ctx.bezierCurveTo(
        cpx,
        toY(vals[i - 1]),
        cpx,
        toY(vals[i]),
        toX(i),
        toY(vals[i]),
      );
    }
    ctx.lineTo(toX(vals.length - 1), H - pad.bottom);
    ctx.lineTo(toX(0), H - pad.bottom);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(vals[0]));
    for (let i = 1; i < vals.length; i++) {
      const cpx = (toX(i - 1) + toX(i)) / 2;
      ctx.bezierCurveTo(
        cpx,
        toY(vals[i - 1]),
        cpx,
        toY(vals[i]),
        toX(i),
        toY(vals[i]),
      );
    }
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // X labels
    const labelStep = Math.ceil(vals.length / 9);
    ctx.fillStyle = onSurface;
    ctx.font = '11px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < vals.length; i += labelStep) {
      ctx.fillText(points[i].label, toX(i), H - pad.bottom + 18);
    }

    // Last point dot
    const lx = toX(vals.length - 1);
    const ly = toY(vals[vals.length - 1]);
    ctx.beginPath();
    ctx.arc(lx, ly, 5, 0, Math.PI * 2);
    ctx.fillStyle = lineColor;
    ctx.fill();
    ctx.strokeStyle = this.getCSSVar('--surface') || '#101415';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

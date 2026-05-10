import { Component, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import {
  WeatherService,
  LocationResult,
} from '../../../shared/services/weather.service';
import {
  I18nService,
  UnitsService,
} from '../../../shared/services/theme.service';
import { City, WeatherData } from '../../../shared/models/weather.model';
import { forkJoin, of, Subject } from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  switchMap,
  takeUntil,
} from 'rxjs/operators';

@Component({
  selector: 'app-favorites',
  templateUrl: './favorites.component.html',
  styleUrls: ['./favorites.component.scss'],
})
export class FavoritesComponent implements OnInit, OnDestroy {
  // ── Favoritos do utilizador atual ─────────────────────────────────────────
  cities: City[] = [];
  loading = true;

  // ── Painel "todas as cidades registadas" ──────────────────────────────────
  allCities: City[] = [];
  showAdd = false;

  // ── Modal de pesquisa / adicionar cidade ──────────────────────────────────
  showCityModal = false;

  // Pesquisa dentro do modal
  searchQuery = '';
  searchResults: LocationResult[] = [];
  searching = false;
  searchError = '';
  private readonly search$ = new Subject<string>();

  // Cidade selecionada nos resultados (aguarda confirmação)
  pendingLocation: LocationResult | null = null;
  adding = false;
  addError = '';

  // ── Dados meteorológicos por cidade ───────────────────────────────────────
  weatherByCity: Record<string, WeatherData> = {};

  private readonly destroy$ = new Subject<void>();

  constructor(
    private ws: WeatherService,
    public i18n: I18nService,
    public units: UnitsService,
    private cdr: ChangeDetectorRef,
  ) {}

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    // Re-render reativo quando língua ou unidade mudam
    this.i18n.lang$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.cdr.markForCheck());

    this.units.unit$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.cdr.markForCheck());

    // Pesquisa com debounce dentro do modal
    this.search$
      .pipe(
        map((q) => q.trim()),
        debounceTime(300),
        distinctUntilChanged(),
        filter((q) => q.length >= 2),
        switchMap((q) => {
          this.searching = true;
          this.searchError = '';
          this.cdr.markForCheck();
          return this.ws.searchLocations(q).pipe(
            catchError(() => {
              this.searchError = this.i18n.t('favorites.search_error');
              return of([]);
            }),
          );
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((results) => {
        this.searchResults = results;
        this.searching = false;
        this.cdr.markForCheck();
      });

    // Carregar favoritos do utilizador autenticado
    this.loadFavorites();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.search$.complete();
  }

  // ── Carregar favoritos (por user via token) ───────────────────────────────

  private loadFavorites(): void {
    this.loading = true;

    // getFavoriteCities() usa /favorites que o backend filtra por user_id do token
    this.ws
      .getFavoriteCities()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cities) => {
          this.cities = cities;
          this.loading = false;
          this.refreshWeather();
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  // Carrega todas as cidades do sistema (para o painel de toggle)
  loadAllCities(): void {
    if (this.allCities.length) {
      this.showAdd = true;
      return;
    }
    this.ws
      .getCities()
      .pipe(takeUntil(this.destroy$))
      .subscribe((all) => {
        this.allCities = all;
        this.showAdd = true;
        this.cdr.markForCheck();
      });
  }

  // ── Dados meteorológicos ──────────────────────────────────────────────────

  refreshWeather(): void {
    if (!this.cities.length) {
      this.weatherByCity = {};
      return;
    }

    const requests = this.cities.map((c) =>
      this.ws.getCurrentWeather(c.name).pipe(
        catchError(() => of(null)),
        map((w) => ({ key: c.name, value: w })),
      ),
    );

    forkJoin(requests).subscribe((rows) => {
      const next: Record<string, WeatherData> = {};
      for (const r of rows) {
        if (r.value) next[r.key] = r.value as WeatherData;
      }
      this.weatherByCity = next;
      this.cdr.markForCheck();
    });
  }

  getWeather(city: string): WeatherData | null {
    return this.weatherByCity[city] || null;
  }

  getTemp(city: string): string {
    const raw = this.getWeather(city)?.temperature;
    if (raw == null) return '--';
    return `${this.units.convert(raw)}${this.units.symbol}`;
  }

  // ── Toggle favorito (remover) ─────────────────────────────────────────────

  toggleFavorite(city: City): void {
    const next = !city.isFavorite;
    this.ws.setFavorite(city.id, next).subscribe({
      next: () => {
        if (!next) {
          // Removido dos favoritos
          this.cities = this.cities.filter((c) => c.id !== city.id);
        } else {
          city.isFavorite = true;
        }
        // Sincronizar no painel "todas as cidades" se estiver aberto
        const found = this.allCities.find((c) => c.id === city.id);
        if (found) found.isFavorite = next;
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  // Toggle a partir do painel "todas as cidades"
  toggleFromAll(city: City): void {
    const next = !city.isFavorite;
    this.ws.setFavorite(city.id, next).subscribe({
      next: () => {
        city.isFavorite = next;
        if (next) {
          if (!this.cities.find((c) => c.id === city.id)) {
            this.cities = [...this.cities, { ...city, isFavorite: true }];
            this.refreshWeather();
          }
        } else {
          this.cities = this.cities.filter((c) => c.id !== city.id);
        }
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  // ── Modal de pesquisa ─────────────────────────────────────────────────────

  openCityModal(): void {
    this.showCityModal = true;
    this.searchQuery = '';
    this.searchResults = [];
    this.pendingLocation = null;
    this.addError = '';
    this.searchError = '';
  }

  closeCityModal(): void {
    if (this.adding) return;
    this.showCityModal = false;
    this.searchQuery = '';
    this.searchResults = [];
    this.pendingLocation = null;
    this.addError = '';
    this.searchError = '';
  }

  onSearchChange(value: string): void {
    this.searchQuery = value;
    this.pendingLocation = null;
    this.addError = '';
    if (!value || value.trim().length < 2) {
      this.searchResults = [];
      return;
    }
    this.search$.next(value);
  }

  selectLocation(loc: LocationResult): void {
    this.pendingLocation = loc;
    this.searchQuery = `${loc.name}${loc.region ? ', ' + loc.region : ''}, ${loc.country}`;
    this.searchResults = [];
    this.addError = '';
  }

  // ── Adicionar cidade via pesquisa ─────────────────────────────────────────

  confirmAdd(): void {
    if (!this.pendingLocation || this.adding) return;

    const loc = this.pendingLocation;

    // Verificar se a cidade já está nos favoritos do user
    const alreadyFav = this.cities.some(
      (c) => c.name.toLowerCase() === loc.name.toLowerCase(),
    );
    if (alreadyFav) {
      this.addError = this.i18n.t('favorites.already_fav');
      return;
    }

    this.adding = true;
    this.addError = '';

    // Fluxo:
    // 1. Tenta encontrar a cidade no sistema (/cities)
    // 2a. Se existir → setFavorite(id, true)
    // 2b. Se não existir → addCity() → setFavorite(id, true)
    this.ws
      .getCities()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (all) => {
          const existing = all.find(
            (c) => c.name.toLowerCase() === loc.name.toLowerCase(),
          );

          if (existing) {
            // Cidade já existe no sistema — só marcar como favorita
            this.ws.setFavorite(existing.id, true).subscribe({
              next: () => {
                existing.isFavorite = true;
                if (!this.cities.find((c) => c.id === existing.id)) {
                  this.cities = [...this.cities, existing];
                }
                this.adding = false;
                this.showCityModal = false;
                this.pendingLocation = null;
                this.refreshWeather();
                this.cdr.markForCheck();
              },
              error: () => {
                this.adding = false;
                this.addError = this.i18n.t('favorites.add_error');
                this.cdr.markForCheck();
              },
            });
          } else {
            // Cidade nova — criar e depois favoritar
            this.ws
              .addCity({
                name: loc.name,
                country: loc.country,
                lat: loc.lat,
                lon: loc.lon,
              })
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (created) => {
                  this.ws.setFavorite(created.id, true).subscribe({
                    next: () => {
                      const withFav: City = { ...created, isFavorite: true };
                      this.cities = [...this.cities, withFav];
                      this.adding = false;
                      this.showCityModal = false;
                      this.pendingLocation = null;
                      this.refreshWeather();
                      this.cdr.markForCheck();
                    },
                    error: () => {
                      // Cidade criada mas não foi possível favoritar
                      this.adding = false;
                      this.addError = this.i18n.t('favorites.fav_error');
                      this.cdr.markForCheck();
                    },
                  });
                },
                error: () => {
                  this.adding = false;
                  this.addError = this.i18n.t('favorites.add_error');
                  this.cdr.markForCheck();
                },
              });
          }
        },
        error: () => {
          this.adding = false;
          this.addError = this.i18n.t('favorites.add_error');
          this.cdr.markForCheck();
        },
      });
  }

  // ── Insights ──────────────────────────────────────────────────────────────

  get avgTemp(): string {
    if (!this.cities.length) return '—';
    const temps = this.cities
      .map((c) => this.getWeather(c.name)?.temperature)
      .filter((x): x is number => typeof x === 'number');
    if (!temps.length) return '—';
    const avg = Math.round(temps.reduce((a, b) => a + b, 0) / temps.length);
    return `${this.units.convert(avg)}${this.units.symbol}`;
  }

  get uniqueCountryCount(): number {
    return new Set(this.cities.map((c) => c.country)).size;
  }

  get avgUv(): string {
    if (!this.cities.length) return '—';
    const uvs = this.cities
      .map((c) => this.getWeather(c.name)?.uvIndex)
      .filter((x): x is number => typeof x === 'number' && x > 0);
    if (!uvs.length) return '—';
    return String(Math.round(uvs.reduce((a, b) => a + b, 0) / uvs.length));
  }
}

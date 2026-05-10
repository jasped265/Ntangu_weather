import { Component, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { WeatherService } from '../../../shared/services/weather.service';
import {
  I18nService,
  UnitsService,
} from '../../../shared/services/theme.service';
import { City, WeatherData } from '../../../shared/models/weather.model';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, map, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-favorites',
  templateUrl: './favorites.component.html',
  styleUrls: ['./favorites.component.scss'],
})
export class FavoritesComponent implements OnInit, OnDestroy {
  cities: City[] = [];
  allCities: City[] = [];
  loading = true;

  // Painel "todas as cidades" — visível por defeito ao entrar
  showAdd = true;

  // Modal "Nova cidade"
  showCityModal = false;
  newCity = { name: '', country: '', lat: 0, lon: 0 };
  adding = false;
  addError = '';

  weatherByCity: Record<string, WeatherData> = {};

  private readonly destroy$ = new Subject<void>();

  constructor(
    private ws: WeatherService,
    public i18n: I18nService,
    public units: UnitsService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.i18n.lang$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.cdr.markForCheck());
    this.units.unit$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.cdr.markForCheck());

    this.ws.getCities().subscribe((c: City[]) => {
      this.allCities = c;
      this.cities = c.filter((x: City) => x.isFavorite);
      this.refreshWeather();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  refreshWeather(): void {
    if (!this.cities.length) {
      this.weatherByCity = {};
      this.loading = false;
      return;
    }

    this.loading = true;
    const requests = this.cities.map((c) =>
      this.ws.getCurrentWeather(c.name).pipe(
        catchError(() => of(null)),
        map((w) => ({ key: c.name, value: w })),
      ),
    );

    forkJoin(requests).subscribe((rows) => {
      const next: Record<string, WeatherData> = {};
      for (const r of rows) {
        if (r.value) next[r.key] = r.value;
      }
      this.weatherByCity = next;
      this.loading = false;
    });
  }

  getWeather(city: string): WeatherData | null {
    return this.weatherByCity[city] || null;
  }

  /** Returns temperature already converted to the current unit */
  getTemp(city: string): string {
    const raw = this.getWeather(city)?.temperature;
    if (raw == null) return '--';
    return `${this.units.convert(raw)}${this.units.symbol}`;
  }

  toggleFavorite(city: City): void {
    const next = !city.isFavorite;
    this.ws.setFavorite(city.id, next).subscribe({
      next: () => {
        city.isFavorite = next;
        this.cities = this.allCities.filter((c: City) => c.isFavorite);
        this.refreshWeather();
      },
      error: () => {},
    });
  }

  canSubmit(): boolean {
    return (
      !!this.newCity.name.trim() &&
      !!this.newCity.country.trim() &&
      !this.adding
    );
  }

  closeCityModal(): void {
    if (this.adding) return;
    this.showCityModal = false;
    this.addError = '';
    this.newCity = { name: '', country: '', lat: 0, lon: 0 };
  }

  /** Criar uma cidade nova directamente desde Favoritos */
  addCity(): void {
    const name = this.newCity.name.trim();
    const country = this.newCity.country.trim();

    if (!name || !country) {
      this.addError = 'Preencha o nome da cidade e o país.';
      return;
    }

    const duplicate = this.allCities.some(
      (c) =>
        c.name.toLowerCase() === name.toLowerCase() &&
        c.country.toLowerCase() === country.toLowerCase(),
    );
    if (duplicate) {
      this.addError = 'Essa cidade já está registada.';
      return;
    }

    this.adding = true;
    this.addError = '';

    const payload = { ...this.newCity, name, country };

    this.ws
      .addCity(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (c: City) => {
          const created: City = { ...c, isFavorite: true };
          this.allCities = [...this.allCities, created];

          const finish = () => {
            this.cities = this.allCities.filter((x) => x.isFavorite);
            this.refreshWeather();
            this.adding = false;
            this.showCityModal = false;
            this.newCity = { name: '', country: '', lat: 0, lon: 0 };
            this.cdr.markForCheck();
          };

          if (!c.isFavorite) {
            this.ws.setFavorite(c.id, true).subscribe({
              next: finish,
              error: () => {
                this.adding = false;
                this.addError =
                  'Cidade criada, mas não foi possível marcar como favorita.';
              },
            });
          } else {
            finish();
          }
        },
        error: () => {
          this.adding = false;
          this.addError = 'Não foi possível criar a cidade. Tente novamente.';
        },
      });
  }

  get avgTemp(): string {
    if (!this.cities.length) return '0';
    const temps = this.cities
      .map((c: City) => this.getWeather(c.name)?.temperature)
      .filter((x): x is number => typeof x === 'number');
    if (!temps.length) return '0';
    const avg = Math.round(temps.reduce((a, b) => a + b, 0) / temps.length);
    return `${this.units.convert(avg)}${this.units.symbol}`;
  }

  get uniqueCountryCount(): number {
    return new Set(this.cities.map((c: City) => c.country)).size;
  }
}

import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { WeatherService } from '../../shared/services/weather.service';
import {
  WeatherData,
  HourlyForecast,
  DailyForecast,
} from '../../shared/models/weather.model';
import { LocationStoreService } from '../../shared/services/location-store.service';
import { I18nService, UnitsService } from '../../shared/services/theme.service';
import { Subject, switchMap, takeUntil } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  weather!: WeatherData;
  hourly: HourlyForecast[] = [];
  daily: DailyForecast[] = [];
  loading = true;
  private readonly destroy$ = new Subject<void>();

  // i18n keys indexed by JS getDay() (0=Sun … 6=Sat)
  private readonly DAY_KEYS = [
    'days.sun',
    'days.mon',
    'days.tue',
    'days.wed',
    'days.thu',
    'days.fri',
    'days.sat',
  ];

  constructor(
    private ws: WeatherService,
    private locationStore: LocationStoreService,
    public units: UnitsService,
    public i18n: I18nService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.locationStore.selected$
      .pipe(
        switchMap((loc) => this.ws.getCurrentWeather(loc.name)),
        takeUntil(this.destroy$),
      )
      .subscribe((w) => {
        this.weather = w;
        this.loading = false;
      });

    this.locationStore.selected$
      .pipe(
        switchMap((loc) => this.ws.getHourlyForecast(loc.name)),
        takeUntil(this.destroy$),
      )
      .subscribe((h) => (this.hourly = h));

    this.locationStore.selected$
      .pipe(
        switchMap((loc) => this.ws.getDailyForecast(loc.name)),
        takeUntil(this.destroy$),
      )
      .subscribe((d) => (this.daily = d));

    this.i18n.lang$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.cdr.markForCheck());
    this.units.unit$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.cdr.markForCheck());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Returns the translated day abbreviation for a forecast item.
   * Uses the ISO date string from d.day ("2026-05-11") if available,
   * otherwise falls back to today + index offset.
   */
  getDayLabel(index: number, dateStr?: string): string {
    let d: Date;
    if (dateStr && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      // Parse ISO date — add T12:00 to avoid timezone midnight-shift issues
      d = new Date(dateStr + 'T12:00:00');
    } else {
      d = new Date();
      d.setDate(d.getDate() + index);
    }
    return this.i18n.t(this.DAY_KEYS[d.getDay()]);
  }

  getMetricColor(value: number, metric: string): string {
    if (metric === 'uv') {
      if (value <= 2) return '#4caf50';
      if (value <= 5) return '#edc225';
      if (value <= 7) return '#ff9800';
      return '#f44336';
    }
    return 'var(--primary)';
  }

  getUvLabel(uv: number): string {
    if (uv <= 2) return this.i18n.t('uv.low');
    if (uv <= 5) return this.i18n.t('uv.moderate');
    if (uv <= 7) return this.i18n.t('uv.high');
    return this.i18n.t('uv.veryHigh');
  }

  getUvWidth(uv: number): string {
    return Math.min((uv / 11) * 100, 100) + '%';
  }
}

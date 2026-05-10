import { Component, ChangeDetectorRef, OnDestroy, OnInit } from '@angular/core';
import { ThemeService, I18nService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';
import { WeatherService, LocationResult } from '../../services/weather.service';
import { LocationStoreService } from '../../services/location-store.service';
import {
  Subject,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  switchMap,
  takeUntil,
} from 'rxjs';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss'],
})
export class TopbarComponent implements OnInit, OnDestroy {
  searchQuery = '';
  results: LocationResult[] = [];
  searching = false;

  private readonly search$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  constructor(
    public theme: ThemeService,
    public i18n: I18nService,
    public auth: AuthService,
    private weather: WeatherService,
    private locationStore: LocationStoreService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // Re-render placeholder text when language changes
    this.i18n.lang$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.cdr.markForCheck();
    });

    this.search$
      .pipe(
        map((q) => q.trim()),
        debounceTime(250),
        distinctUntilChanged(),
        filter((q) => q.length >= 2),
        switchMap((q) => {
          this.searching = true;
          return this.weather.searchLocations(q);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (items) => {
          this.results = items;
          this.searching = false;
        },
        error: () => {
          this.results = [];
          this.searching = false;
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.search$.complete();
  }

  onSearchChange(value: string): void {
    this.searchQuery = value;
    if (!value || value.trim().length < 2) {
      this.results = [];
      return;
    }
    this.search$.next(value);
  }

  selectLocation(loc: LocationResult): void {
    this.locationStore.setLocation(loc);
    this.weather.getCurrentWeather(loc.name).subscribe();
    this.searchQuery = `${loc.name}${loc.country ? ', ' + loc.country : ''}`;
    this.results = [];
  }
}

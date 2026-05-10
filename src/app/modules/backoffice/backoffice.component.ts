import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { WeatherService } from '../../shared/services/weather.service';
import { User, City, WeatherAlert } from '../../shared/models/weather.model';
import { LocationStoreService } from '../../shared/services/location-store.service';
import { I18nService } from '../../shared/services/theme.service';
import { Subject, takeUntil, forkJoin } from 'rxjs';

@Component({
  selector: 'app-backoffice',
  templateUrl: './backoffice.component.html',
  styleUrls: ['./backoffice.component.scss'],
})
export class BackofficeComponent implements OnInit, OnDestroy {
  users: User[] = [];
  cities: City[] = [];
  alerts: WeatherAlert[] = [];
  loading = true;
  loadingAlerts = true;

  showUserModal = false;
  showCityModal = false;
  newUser = {
    name: '',
    email: '',
    role: 'user' as 'admin' | 'user',
    plan: 'free' as 'free' | 'premium' | 'pro',
  };
  newCity = { name: '', country: '', lat: 0, lon: 0 };
  private readonly destroy$ = new Subject<void>();

  stats = [
    {
      labelKey: 'backoffice.stat_users',
      value: '—',
      icon: 'group',
      delta: '',
      deltaPositive: true,
    },
    {
      labelKey: 'backoffice.stat_cities',
      value: '—',
      icon: 'location_city',
      delta: '',
      deltaPositive: true,
    },
    {
      labelKey: 'backoffice.stat_sensors',
      value: '—',
      icon: 'sensors',
      delta: '',
      deltaPositive: true,
    },
    {
      labelKey: 'backoffice.stat_alerts',
      value: '—',
      icon: 'warning_amber',
      delta: '',
      deltaPositive: false,
    },
  ];

  constructor(
    private ws: WeatherService,
    private locationStore: LocationStoreService,
    public i18n: I18nService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    forkJoin({
      users: this.ws.getUsers(),
      cities: this.ws.getCities(),
    }).subscribe({
      next: ({ users, cities }) => {
        this.users = users;
        this.cities = cities;
        this.loading = false;

        const activeCities = cities.filter((c) => c.status === 'stable').length;
        const totalSensors = cities.reduce(
          (sum, c) => sum + (c.sensors ?? 0),
          0,
        );

        this.stats[0].value = users.length.toLocaleString('pt-AO');
        this.stats[0].delta = `${users.filter((u) => u.role === 'admin').length} admin(s)`;

        this.stats[1].value = activeCities.toLocaleString('pt-AO');
        this.stats[1].delta = `${cities.length} ${this.i18n.t('backoffice.total')}`;

        this.stats[2].value =
          totalSensors > 0
            ? totalSensors.toLocaleString('pt-AO')
            : `${cities.length} ${this.i18n.t('backoffice.city_count')}`;
        this.stats[2].delta = `${activeCities} ${this.i18n.t('backoffice.stable')}`;

        if (cities.length > 0) {
          this.loadAlertsForCity(cities[0].name);
        } else {
          this.loadingAlerts = false;
        }
      },
      error: () => {
        this.loading = false;
        this.loadingAlerts = false;
      },
    });

    this.locationStore.selected$
      .pipe(takeUntil(this.destroy$))
      .subscribe((loc) => {
        if (loc?.name) this.loadAlertsForCity(loc.name);
      });

    // Re-render quando a língua muda
    this.i18n.lang$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.cdr.markForCheck());
  }

  private loadAlertsForCity(cityName: string): void {
    this.loadingAlerts = true;
    this.ws.getAlerts(cityName).subscribe({
      next: (a) => {
        this.alerts = a;
        this.stats[3].value = a.length.toLocaleString('pt-AO');
        this.stats[3].delta =
          a.filter((x) => x.type === 'critical').length +
          ` ${this.i18n.t('backoffice.critical')}`;
        this.stats[3].deltaPositive =
          a.filter((x) => x.type === 'critical').length === 0;
        this.loadingAlerts = false;
      },
      error: () => {
        this.loadingAlerts = false;
      },
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  deleteUser(id: string): void {
    if (confirm(this.i18n.t('backoffice.confirm_delete_user'))) {
      this.ws
        .deleteUser(id)
        .subscribe(() => (this.users = this.users.filter((u) => u.id !== id)));
      this.stats[0].value = (this.users.length - 1).toLocaleString('pt-AO');
    }
  }

  deleteCity(id: string): void {
    if (confirm(this.i18n.t('backoffice.confirm_delete_city'))) {
      this.ws.deleteCity(id).subscribe(() => {
        this.cities = this.cities.filter((c) => c.id !== id);
        this.stats[1].value = this.cities
          .filter((c) => c.status === 'stable')
          .length.toLocaleString('pt-AO');
        this.stats[1].delta = `${this.cities.length} ${this.i18n.t('backoffice.total')}`;
      });
    }
  }

  addUser(): void {
    this.ws.addUser(this.newUser).subscribe((u) => {
      this.users.push(u);
      this.stats[0].value = this.users.length.toLocaleString('pt-AO');
      this.showUserModal = false;
      this.newUser = { name: '', email: '', role: 'user', plan: 'free' };
    });
  }

  addCity(): void {
    this.ws.addCity(this.newCity).subscribe((c) => {
      this.cities.push(c);
      this.stats[1].value = this.cities
        .filter((x) => x.status === 'stable')
        .length.toLocaleString('pt-AO');
      this.stats[1].delta = `${this.cities.length} ${this.i18n.t('backoffice.total')}`;
      this.showCityModal = false;
      this.newCity = { name: '', country: '', lat: 0, lon: 0 };
    });
  }
}

import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { WeatherService } from '../../shared/services/weather.service';
import { User, City, WeatherAlert } from '../../shared/models/weather.model';
import { LocationStoreService } from '../../shared/services/location-store.service';
import { I18nService } from '../../shared/services/theme.service';
import { Subject, takeUntil, forkJoin, switchMap } from 'rxjs';

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
  exportingCSV = false;
  exportingPDF = false;

  /** Total users returned by the API — shown in the table footer */
  totalUsers = 0;

  showUserModal = false;
  showCityModal = false;
  newUser = {
    name: '',
    email: '',
    role: 'user' as 'admin' | 'user',
    plan: 'free' as 'free' | 'premium' | 'pro',
  };
  newCity = { name: '', country: '', lat: 0, lon: 0 };

  toast = { show: false, message: '', error: false };

  private readonly BASE = 'http://localhost:8000/api/v1';
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
    private http: HttpClient,
    private locationStore: LocationStoreService,
    public i18n: I18nService,
    private cdr: ChangeDetectorRef,
  ) {}

  // ── Auth ──────────────────────────────────────────────────────────────────

  private getToken(): string {
    return localStorage.getItem('ntangu_access_token') || '';
  }

  private authHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  private get locale(): string {
    return this.i18n.currentLang === 'pt' ? 'pt-AO' : 'en-GB';
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    forkJoin({
      users: this.ws.getUsers(),
      cities: this.ws.getCities(),
    }).subscribe({
      next: ({ users, cities }) => {
        this.users = users;
        this.cities = cities;
        this.totalUsers = users.length; // real value from API
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

        this.stats[2].value = (
          totalSensors > 0 ? totalSensors : cities.length
        ).toLocaleString('pt-AO');
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

    this.i18n.lang$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.cdr.markForCheck());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Alerts ────────────────────────────────────────────────────────────────

  private loadAlertsForCity(cityName: string): void {
    this.loadingAlerts = true;
    this.ws.getAlerts(cityName).subscribe({
      next: (a) => {
        this.alerts = a;
        this.stats[3].value = a.length.toLocaleString('pt-AO');
        const critCount = a.filter((x) => x.type === 'critical').length;
        this.stats[3].delta = `${critCount} ${this.i18n.t('backoffice.critical')}`;
        this.stats[3].deltaPositive = critCount === 0;
        this.loadingAlerts = false;
      },
      error: () => {
        this.loadingAlerts = false;
      },
    });
  }

  // ── Export ────────────────────────────────────────────────────────────────

  exportCSV(): void {
    if (this.exportingCSV) return;
    this.exportingCSV = true;

    this.ws.exportGlobalCSV().subscribe({
      next: (blob) => {
        this.exportingCSV = false;
        this.triggerDownload(blob, 'cidades.csv', 'text/csv');
        this.showToast(this.i18n.t('reports.csv_ok'));
      },
      error: (err) => {
        this.exportingCSV = false;
        this.readBlobError(err, this.i18n.t('reports.csv_err'));
      },
    });
  }

  exportPDF(): void {
    if (this.exportingPDF) return;
    this.exportingPDF = true;

    const now = new Date();
    const name = `Backoffice ${now.toLocaleDateString(this.locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })} ${now.toLocaleTimeString(this.locale, { hour: '2-digit', minute: '2-digit' })}`;

    // generateReport() returns Observable<number> — the report ID directly
    this.ws
      .generateReport(name, 'weather_summary')
      .pipe(
        switchMap((repId: number) => this.ws.exportReportBlob(repId, 'pdf')),
      )
      .subscribe({
        next: (blob) => {
          this.exportingPDF = false;
          this.triggerDownload(blob, 'cidades.pdf', 'application/pdf');
          this.showToast(`PDF ${this.i18n.t('reports.download_ok')}`);
        },
        error: (err) => {
          this.exportingPDF = false;
          this.readBlobError(
            err,
            `${this.i18n.t('reports.download_err')} PDF (${err.status})`,
          );
        },
      });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private triggerDownload(
    blob: Blob,
    filename: string,
    mimeType: string,
  ): void {
    const url = window.URL.createObjectURL(
      new Blob([blob], { type: mimeType }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  private readBlobError(err: any, fallbackMsg: string): void {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string);
        this.showToast(json?.message || fallbackMsg, true);
      } catch {
        this.showToast(fallbackMsg, true);
      }
    };
    if (err?.error instanceof Blob) {
      reader.readAsText(err.error);
    } else {
      this.showToast(err?.error?.message || fallbackMsg, true);
    }
  }

  private showToast(message: string, error = false): void {
    this.toast = { show: true, message, error };
    setTimeout(() => (this.toast = { ...this.toast, show: false }), 3500);
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  deleteUser(id: string): void {
    if (confirm(this.i18n.t('backoffice.confirm_delete_user'))) {
      this.ws.deleteUser(id).subscribe(() => {
        this.users = this.users.filter((u) => u.id !== id);
        this.totalUsers = this.users.length;
        this.stats[0].value = this.users.length.toLocaleString('pt-AO');
      });
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
      this.totalUsers = this.users.length;
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

import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {
  WeatherService,
  ReportSummary,
} from '../../shared/services/weather.service';
import { I18nService } from '../../shared/services/theme.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss'],
})
export class ReportsComponent implements OnInit, OnDestroy {
  summary: ReportSummary | null = null;
  reports: any[] = [];
  loading = true;
  generating = false;
  exporting = false;

  toast = { show: false, message: '', error: false };

  private readonly BASE = 'http://localhost:8000/api/v1';
  private readonly destroy$ = new Subject<void>();

  constructor(
    private ws: WeatherService,
    private http: HttpClient,
    public i18n: I18nService,
    private cdr: ChangeDetectorRef,
  ) {}

  private getToken(): string {
    return localStorage.getItem('ntangu_access_token') || '';
  }

  private authHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  ngOnInit(): void {
    this.ws.getReportsSummary().subscribe((s) => (this.summary = s));
    this.loadReports();

    // Re-render quando a língua muda
    this.i18n.lang$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.cdr.markForCheck());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadReports(): void {
    this.loading = true;
    this.ws.getReports().subscribe({
      next: (r) => {
        this.reports = r;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  /** Locale BCP-47 derivado da língua atual do i18n */
  private get locale(): string {
    return this.i18n.currentLang === 'pt' ? 'pt-AO' : 'en-GB';
  }

  /** Título traduzido + data formatada para um relatório (computed na render) */
  reportTitle(rep: any): string {
    const date = new Date(rep.created_at);
    const datePart = date.toLocaleDateString(this.locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const timePart = date.toLocaleTimeString(this.locale, {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${this.i18n.t('reports.itemTitle')} ${datePart} ${timePart}`;
  }

  /** Tipo do relatório traduzido (cai para o valor cru se a chave faltar) */
  reportType(rep: any): string {
    const key = `reports.types.${String(rep?.type || '').toLowerCase()}`;
    const translated = this.i18n.t(key);
    return translated === key ? rep.type : translated;
  }

  generate(): void {
    if (this.generating) return;
    this.generating = true;

    const now = new Date();
    const name = `${this.i18n.t('reports.itemTitle')} ${now.toLocaleDateString(
      this.locale,
      { day: '2-digit', month: '2-digit', year: 'numeric' },
    )} ${now.toLocaleTimeString(this.locale, {
      hour: '2-digit',
      minute: '2-digit',
    })}`;

    this.ws.generateReport(name, 'weather_summary').subscribe({
      next: () => {
        this.generating = false;
        this.showToast(this.i18n.t('reports.generated_ok'));
        this.loadReports();
      },
      error: (err) => {
        this.generating = false;
        const msg = err?.error?.message || this.i18n.t('reports.generated_err');
        this.showToast(msg, true);
      },
    });
  }

  exportGlobalCSV(): void {
    if (this.exporting) return;
    this.exporting = true;

    const csvUrl = `${this.BASE}/reports/export/csv?type=cities`;

    this.http
      .get(csvUrl, {
        headers: this.authHeaders(),
        responseType: 'blob',
        observe: 'response',
      })
      .subscribe({
        next: (response) => {
          this.exporting = false;
          this.triggerDownload(
            response.body!,
            'relatorio-cidades.csv',
            'text/csv',
          );
          this.showToast(this.i18n.t('reports.csv_ok'));
        },
        error: (err) => {
          this.exporting = false;
          this.readBlobError(err, this.i18n.t('reports.csv_err'));
        },
      });
  }

  downloadReport(rep: any, format: 'csv' | 'pdf'): void {
    const repId = rep?.id ?? rep?.report_id ?? rep?.uuid;
    if (!repId) {
      this.showToast(this.i18n.t('reports.id_err'), true);
      return;
    }

    const url = `${this.BASE}/reports/${repId}/export/${format}`;
    const mimeType = format === 'csv' ? 'text/csv' : 'application/pdf';
    // Nome de ficheiro baseado no título traduzido (em vez do rep.name persistido)
    const safeName = this.reportTitle(rep)
      .replace(/[^a-zA-Z0-9_\-. ]/g, '')
      .replace(/\s+/g, '-');
    const filename = `${safeName}.${format}`;

    this.http
      .get(url, {
        headers: this.authHeaders(),
        responseType: 'blob',
        observe: 'response',
      })
      .subscribe({
        next: (response) => {
          const blob = response.body!;
          this.triggerDownload(blob, filename, mimeType);
          this.showToast(
            `${format.toUpperCase()} ${this.i18n.t('reports.download_ok')}`,
          );
        },
        error: (err) => {
          console.error('[downloadReport] Erro:', err.status, url);
          this.readBlobError(
            err,
            `${this.i18n.t('reports.download_err')} ${format.toUpperCase()} (${err.status})`,
          );
        },
      });
  }

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
}

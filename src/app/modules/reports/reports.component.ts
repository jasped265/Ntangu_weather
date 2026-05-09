import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {
  WeatherService,
  ReportSummary,
} from '../../shared/services/weather.service';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss'],
})
export class ReportsComponent implements OnInit {
  summary: ReportSummary | null = null;
  reports: any[] = [];
  loading = true;
  generating = false;
  exporting = false;

  toast = { show: false, message: '', error: false };

  // FIX: BASE apenas necessário para endpoints de blob (export/download)
  // que não estão cobertos pelo WeatherService
  private readonly BASE = 'http://localhost:8000/api/v1';

  constructor(
    private ws: WeatherService,
    private http: HttpClient,
  ) {}

  // ── Auth token ────────────────────────────────────────────────────────────
  // FIX: Unificado com a mesma chave usada no WeatherService ('ntangu_access_token')

  private getToken(): string {
    return localStorage.getItem('ntangu_access_token') || '';
  }

  private authHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.ws.getReportsSummary().subscribe((s) => (this.summary = s));
    this.loadReports();
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

  // ── Gerar relatório ───────────────────────────────────────────────────────
  // FIX: Usa ws.generateReport() em vez de chamada HTTP direta,
  //      garantindo token correto e endpoint correto (/reports/generate)

  generate(): void {
    if (this.generating) return;
    this.generating = true;

    const now = new Date();
    const name = `Relatorio ${now.toLocaleDateString('pt-AO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })} ${now.toLocaleTimeString('pt-AO', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;

    this.ws.generateReport(name, 'weather_summary').subscribe({
      next: () => {
        this.generating = false;
        this.showToast('Relatório gerado com sucesso');
        this.loadReports();
      },
      error: (err) => {
        this.generating = false;
        const msg = err?.error?.message || 'Erro ao gerar relatório';
        this.showToast(msg, true);
      },
    });
  }

  // ── Exportar CSV global ───────────────────────────────────────────────────
  // FIX: authHeaders() agora usa o token correto ('ntangu_access_token')

  exportGlobalCSV(): void {
    if (this.exporting) return;
    this.exporting = true;

    this.http
      .get(`${this.BASE}/reports/export/csv?type=cities`, {
        headers: this.authHeaders(),
        responseType: 'blob',
      })
      .subscribe({
        next: (blob) => {
          this.exporting = false;
          this.triggerDownload(blob, 'relatorio-cidades.csv', 'text/csv');
          this.showToast('CSV exportado com sucesso');
        },
        error: (err) => {
          this.exporting = false;
          this.readBlobError(err, 'Erro ao exportar CSV');
        },
      });
  }

  // ── Download por relatório (CSV ou PDF) ───────────────────────────────────
  // FIX: authHeaders() agora usa o token correto ('ntangu_access_token')

  downloadReport(rep: any, format: 'csv' | 'pdf'): void {
    const url = `${this.BASE}/reports/${rep.id}/export/${format}`;
    const mimeType = format === 'csv' ? 'text/csv' : 'application/pdf';
    const filename = `${rep.name.replace(/\s+/g, '-')}.${format}`;

    this.http
      .get(url, {
        headers: this.authHeaders(),
        responseType: 'blob',
      })
      .subscribe({
        next: (blob) => {
          this.triggerDownload(blob, filename, mimeType);
          this.showToast(`${format.toUpperCase()} descarregado`);
        },
        error: (err) => {
          this.readBlobError(err, `Erro ao exportar ${format.toUpperCase()}`);
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

  // FIX: Extraído método reutilizável para ler erros de blob JSON
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

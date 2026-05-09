import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';
import {
  WeatherData,
  HourlyForecast,
  DailyForecast,
  WeatherAlert,
  City,
  User,
} from '../models/weather.model';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface LocationResult {
  name: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
}

export interface MapMarker {
  id: number;
  name: string;
  country: string;
  lat: number;
  lon: number;
  temp: number | null;
  condition: string;
  wind_kph: number | null;
  wind_dir: string | null;
}

export interface ReportSummary {
  total_users: number;
  total_cities: number;
  generated_at: string;
}

@Injectable({ providedIn: 'root' })
export class WeatherService {
  private readonly baseUrl = 'http://localhost:8000/api/v1';

  constructor(private http: HttpClient) {}

  getCurrentWeather(city: string): Observable<WeatherData> {
    return this.http
      .get<
        ApiResponse<any>
      >(`${this.baseUrl}/weather/current?city=${encodeURIComponent(city)}`, { headers: this.authHeaders() })
      .pipe(map((res) => this.mapCurrentWeather(res.data)));
  }

  getHourlyForecast(city: string): Observable<HourlyForecast[]> {
    return this.http
      .get<
        ApiResponse<any[]>
      >(`${this.baseUrl}/weather/hourly?city=${encodeURIComponent(city)}`, { headers: this.authHeaders() })
      .pipe(
        map((res) =>
          res.data.map((h) => ({
            time: this.formatHourLabel(h.time),
            temperature: Number(h.temperature ?? 0),
            condition: h.condition ?? '',
            icon: this.mapIcon(h.condition, h.icon),
          })),
        ),
      );
  }

  getDailyForecast(city: string): Observable<DailyForecast[]> {
    return this.http
      .get<
        ApiResponse<any[]>
      >(`${this.baseUrl}/weather/daily?city=${encodeURIComponent(city)}`, { headers: this.authHeaders() })
      .pipe(
        map((res) =>
          res.data.map((d) => ({
            day: this.formatDayLabel(d.day),
            high: Number(d.high ?? 0),
            low: Number(d.low ?? 0),
            condition: d.condition ?? '',
            icon: this.mapIcon(d.condition, d.icon),
            precipChance: Number(d.precipChance ?? 0),
          })),
        ),
      );
  }

  getAlerts(city: string): Observable<WeatherAlert[]> {
    return this.http
      .get<
        ApiResponse<any[]>
      >(`${this.baseUrl}/weather/alerts?city=${encodeURIComponent(city)}`, { headers: this.authHeaders() })
      .pipe(
        map((res) =>
          (res.data || []).map((a, idx) => ({
            id: String(idx + 1),
            type: this.normalizeAlertType(a.severity),
            title: a.title || 'Alerta',
            message: a.message || '',
            city,
            timestamp: new Date(a.starts_at || Date.now()),
          })),
        ),
      );
  }

  searchLocations(q: string, limit = 8): Observable<LocationResult[]> {
    return this.http
      .get<
        ApiResponse<LocationResult[]>
      >(`${this.baseUrl}/locations/search?q=${encodeURIComponent(q)}&limit=${encodeURIComponent(String(limit))}`, { headers: this.authHeaders() })
      .pipe(map((res) => res.data || []));
  }

  getMapMarkers(): Observable<MapMarker[]> {
    return this.http
      .get<
        ApiResponse<MapMarker[]>
      >(`${this.baseUrl}/map/markers`, { headers: this.authHeaders() })
      .pipe(map((res) => res.data || []));
  }

  getReports(): Observable<any[]> {
    return this.http
      .get<
        ApiResponse<any[]>
      >(`${this.baseUrl}/reports`, { headers: this.authHeaders() })
      .pipe(map((res) => res.data || []));
  }

  getReportsSummary(): Observable<ReportSummary> {
    return this.http
      .get<
        ApiResponse<ReportSummary>
      >(`${this.baseUrl}/reports/summary`, { headers: this.authHeaders() })
      .pipe(map((res) => res.data));
  }

  generateReport(
    name: string,
    type = 'weather_summary',
    filters: Record<string, unknown> = {},
  ): Observable<number> {
    return this.http
      .post<
        ApiResponse<{ id: number }>
      >(`${this.baseUrl}/reports/generate`, { name, type, filters }, { headers: this.authHeaders() })
      .pipe(map((res) => Number(res.data?.id ?? 0)));
  }

  // FIX: Adicionado método para exportar CSV global como blob
  exportGlobalCSV(): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/reports/export/csv?type=cities`, {
      headers: this.authHeaders(),
      responseType: 'blob',
    });
  }

  // FIX: Adicionado método para descarregar relatório individual (CSV ou PDF)
  exportReportBlob(
    reportId: string | number,
    format: 'csv' | 'pdf',
  ): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}/reports/${reportId}/export/${format}`,
      {
        headers: this.authHeaders(),
        responseType: 'blob',
      },
    );
  }

  getCities(): Observable<City[]> {
    return forkJoin({
      cities: this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/cities`, {
        headers: this.authHeaders(),
      }),
      favorites: this.http.get<ApiResponse<any[]>>(
        `${this.baseUrl}/favorites`,
        { headers: this.authHeaders() },
      ),
    }).pipe(
      map(({ cities, favorites }) => {
        const favoriteIds = new Set(
          (favorites.data || []).map((f) => String(f.id)),
        );
        return (cities.data || []).map((c) =>
          this.mapCity(c, favoriteIds.has(String(c.id))),
        );
      }),
    );
  }

  getFavoriteCities(): Observable<City[]> {
    return this.http
      .get<
        ApiResponse<any[]>
      >(`${this.baseUrl}/favorites`, { headers: this.authHeaders() })
      .pipe(map((res) => (res.data || []).map((c) => this.mapCity(c, true))));
  }

  getUsers(): Observable<User[]> {
    return this.http
      .get<
        ApiResponse<any[]>
      >(`${this.baseUrl}/admin/users`, { headers: this.authHeaders() })
      .pipe(
        map((res) =>
          (res.data || []).map((u) => ({
            id: String(u.id),
            name: u.name,
            email: u.email,
            role: u.role === 'admin' ? 'admin' : 'user',
            plan: 'free',
            status: u.status === 'inactive' ? 'inactive' : 'active',
            createdAt: new Date(u.created_at || Date.now()),
          })),
        ),
      );
  }

  addCity(city: Partial<City>): Observable<City> {
    return this.http
      .post<ApiResponse<any>>(
        `${this.baseUrl}/admin/cities`,
        {
          name: city.name,
          country: city.country,
          lat: city.lat,
          lon: city.lon,
          is_active: 1,
        },
        { headers: this.authHeaders() },
      )
      .pipe(map((res) => this.mapCity(res.data, false)));
  }

  deleteCity(id: string): Observable<void> {
    return this.http
      .delete<
        ApiResponse<any>
      >(`${this.baseUrl}/admin/cities/${id}`, { headers: this.authHeaders() })
      .pipe(map(() => void 0));
  }

  addUser(user: Partial<User>): Observable<User> {
    return this.http
      .post<ApiResponse<any>>(
        `${this.baseUrl}/admin/users`,
        {
          name: user.name,
          email: user.email,
          role: user.role || 'user',
          password: 'User123!',
        },
        { headers: this.authHeaders() },
      )
      .pipe(
        map((res) => ({
          id: String(res.data?.id || Date.now()),
          name: user.name || '',
          email: user.email || '',
          role: user.role === 'admin' ? 'admin' : 'user',
          plan: 'free',
          status: 'active',
          createdAt: new Date(),
        })),
      );
  }

  deleteUser(id: string): Observable<void> {
    return this.http
      .delete<
        ApiResponse<any>
      >(`${this.baseUrl}/admin/users/${id}`, { headers: this.authHeaders() })
      .pipe(map(() => void 0));
  }

  setFavorite(cityId: string, isFavorite: boolean): Observable<void> {
    if (isFavorite) {
      return this.http
        .post<
          ApiResponse<any>
        >(`${this.baseUrl}/favorites/${cityId}`, {}, { headers: this.authHeaders() })
        .pipe(map(() => void 0));
    }
    return this.http
      .delete<
        ApiResponse<any>
      >(`${this.baseUrl}/favorites/${cityId}`, { headers: this.authHeaders() })
      .pipe(map(() => void 0));
  }

  // FIX: Única fonte de verdade para o token de autenticação
  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('ntangu_access_token');
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  private mapCurrentWeather(data: any): WeatherData {
    return {
      city: data?.city || '',
      country: data?.country || '',
      temperature: Number(data?.temp ?? 0),
      feelsLike: Number(data?.feels_like ?? 0),
      condition: data?.condition || '',
      conditionIcon: this.mapIcon(data?.condition, data?.icon),
      humidity: Number(data?.humidity ?? 0),
      windSpeed: Number(data?.wind_kph ?? 0),
      windDirection: String(data?.wind_dir ?? ''),
      uvIndex: Number(data?.uv ?? 0),
      visibility: Number(data?.vis_km ?? 0),
      pressure: Number(data?.pressure_mb ?? 0),
      aqi: Number(data?.aqi ?? 0),
      aqiLabel: this.aqiLabel(Number(data?.aqi ?? 0)),
      sunrise: data?.sunrise || '--:--',
      sunset: data?.sunset || '--:--',
      high: Number(data?.high ?? data?.temp ?? 0),
      low: Number(data?.low ?? data?.temp ?? 0),
      lat: Number(data?.lat ?? 0),
      lon: Number(data?.lon ?? 0),
      timestamp: new Date(),
    };
  }

  private mapCity(city: any, isFavorite: boolean): City {
    return {
      id: String(city.id),
      name: city.name,
      country: city.country,
      lat: Number(city.lat),
      lon: Number(city.lon),
      isFavorite,
      plan: 'free',
      sensors: 0,
      status: city.is_active ? 'stable' : 'warning',
    };
  }

  private mapIcon(condition: string, iconUrl?: string): string {
    const text = (condition || '').toLowerCase();
    if (text.includes('rain') || text.includes('chuva')) return 'rainy';
    if (text.includes('cloud') || text.includes('nublado')) return 'cloud';
    if (text.includes('storm') || text.includes('trovoada'))
      return 'thunderstorm';
    if (iconUrl && iconUrl.includes('night')) return 'dark_mode';
    return 'wb_sunny';
  }

  private formatHourLabel(dateTime: string): string {
    if (!dateTime) return 'N/A';
    const time = dateTime.split(' ')[1] || dateTime;
    return time.slice(0, 5);
  }

  private formatDayLabel(dateStr: string): string {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date
      .toLocaleDateString('pt-PT', { weekday: 'short' })
      .replace('.', '')
      .toUpperCase();
  }

  private normalizeAlertType(
    severity: string,
  ): 'critical' | 'warning' | 'info' {
    const s = (severity || '').toLowerCase();
    if (s.includes('severe') || s.includes('extreme')) return 'critical';
    if (s.includes('moderate') || s.includes('warning')) return 'warning';
    return 'info';
  }

  private aqiLabel(aqi: number): string {
    if (aqi <= 50) return 'BOM';
    if (aqi <= 100) return 'MODERADO';
    if (aqi <= 150) return 'SENSÍVEL';
    return 'RUIM';
  }
}

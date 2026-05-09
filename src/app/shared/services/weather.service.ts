import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, forkJoin, map, of } from 'rxjs';
import { WeatherData, HourlyForecast, DailyForecast, WeatherAlert, City, User } from './weather.model';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class WeatherService {
  private readonly baseUrl = 'http://localhost:8000/api/v1';

  constructor(private http: HttpClient) {}

  getCurrentWeather(city?: string): Observable<WeatherData> {
    const targetCity = city || 'Luanda';
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/weather/current?city=${encodeURIComponent(targetCity)}`, { headers: this.authHeaders() })
      .pipe(map((res) => this.mapCurrentWeather(res.data)));
  }

  getHourlyForecast(): Observable<HourlyForecast[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/weather/hourly?city=Luanda`, { headers: this.authHeaders() })
      .pipe(map((res) => res.data.map((h) => ({
        time: this.formatHourLabel(h.time),
        temperature: Number(h.temperature ?? 0),
        condition: h.condition ?? '',
        icon: this.mapIcon(h.condition, h.icon),
      }))));
  }

  getDailyForecast(): Observable<DailyForecast[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/weather/daily?city=Luanda`, { headers: this.authHeaders() })
      .pipe(map((res) => res.data.map((d) => ({
        day: this.formatDayLabel(d.day),
        high: Number(d.high ?? 0),
        low: Number(d.low ?? 0),
        condition: d.condition ?? '',
        icon: this.mapIcon(d.condition, d.icon),
        precipChance: Number(d.precipChance ?? 0),
      }))));
  }

  getAlerts(): Observable<WeatherAlert[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/weather/alerts?city=Luanda`, { headers: this.authHeaders() })
      .pipe(map((res) => (res.data || []).map((a, idx) => ({
        id: String(idx + 1),
        type: this.normalizeAlertType(a.severity),
        title: a.title || 'Alerta',
        message: a.message || '',
        city: 'Luanda',
        timestamp: new Date(a.starts_at || Date.now()),
      }))));
  }

  getCities(): Observable<City[]> {
    return forkJoin({
      cities: this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/cities`, { headers: this.authHeaders() }),
      favorites: this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/favorites`, { headers: this.authHeaders() }),
    }).pipe(
      map(({ cities, favorites }) => {
        const favoriteIds = new Set((favorites.data || []).map((f) => String(f.id)));
        return (cities.data || []).map((c) => this.mapCity(c, favoriteIds.has(String(c.id))));
      })
    );
  }

  getFavoriteCities(): Observable<City[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/favorites`, { headers: this.authHeaders() })
      .pipe(map((res) => (res.data || []).map((c) => this.mapCity(c, true))));
  }

  getUsers(): Observable<User[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/admin/users`, { headers: this.authHeaders() })
      .pipe(map((res) => (res.data || []).map((u) => ({
        id: String(u.id),
        name: u.name,
        email: u.email,
        role: (u.role === 'admin' ? 'admin' : 'user'),
        plan: 'free',
        status: (u.status === 'inactive' ? 'inactive' : 'active'),
        createdAt: new Date(u.created_at || Date.now()),
      }))));
  }

  addCity(city: Partial<City>): Observable<City> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/admin/cities`, {
      name: city.name,
      country: city.country,
      lat: city.lat,
      lon: city.lon,
      is_active: 1,
    }, { headers: this.authHeaders() })
    .pipe(map((res) => this.mapCity(res.data, false)));
  }

  deleteCity(id: string): Observable<void> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/admin/cities/${id}`, { headers: this.authHeaders() })
      .pipe(map(() => void 0));
  }

  addUser(user: Partial<User>): Observable<User> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/admin/users`, {
      name: user.name,
      email: user.email,
      role: user.role || 'user',
      password: 'User123!',
    }, { headers: this.authHeaders() }).pipe(
      map((res) => ({
        id: String(res.data?.id || Date.now()),
        name: user.name || '',
        email: user.email || '',
        role: (user.role === 'admin' ? 'admin' : 'user'),
        plan: 'free',
        status: 'active',
        createdAt: new Date(),
      }))
    );
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/admin/users/${id}`, { headers: this.authHeaders() })
      .pipe(map(() => void 0));
  }

  setFavorite(cityId: string, isFavorite: boolean): Observable<void> {
    if (isFavorite) {
      return this.http.post<ApiResponse<any>>(`${this.baseUrl}/favorites/${cityId}`, {}, { headers: this.authHeaders() })
        .pipe(map(() => void 0));
    }
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/favorites/${cityId}`, { headers: this.authHeaders() })
      .pipe(map(() => void 0));
  }

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('ntangu_access_token');
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  private mapCurrentWeather(data: any): WeatherData {
    return {
      city: data?.city || 'Luanda',
      country: data?.country || 'Angola',
      temperature: Number(data?.temp ?? 0),
      feelsLike: Number(data?.feels_like ?? 0),
      condition: data?.condition || '',
      conditionIcon: this.mapIcon(data?.condition, data?.icon),
      humidity: Number(data?.humidity ?? 0),
      windSpeed: Number(data?.wind_kph ?? 0),
      windDirection: 'N/A',
      uvIndex: Number(data?.uv ?? 0),
      visibility: 0,
      pressure: 0,
      aqi: Number(data?.aqi ?? 0),
      aqiLabel: this.aqiLabel(Number(data?.aqi ?? 0)),
      sunrise: data?.sunrise || '--:--',
      sunset: data?.sunset || '--:--',
      high: Number(data?.temp ?? 0),
      low: Number(data?.temp ?? 0),
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
    if (text.includes('storm') || text.includes('trovoada')) return 'thunderstorm';
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
    return date.toLocaleDateString('pt-PT', { weekday: 'short' }).replace('.', '').toUpperCase();
  }

  private normalizeAlertType(severity: string): 'critical' | 'warning' | 'info' {
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

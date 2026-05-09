import { Component, OnInit } from '@angular/core';
import { WeatherService } from '../../../shared/services/weather.service';
import { City } from '../../../shared/models/weather.model';
import { WeatherData } from '../../../shared/models/weather.model';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Component({
  selector: 'app-favorites',
  templateUrl: './favorites.component.html',
  styleUrls: ['./favorites.component.scss']
})
export class FavoritesComponent implements OnInit {
  cities: City[] = [];
  allCities: City[] = [];
  loading = true;
  showAdd = false;
  weatherByCity: Record<string, WeatherData> = {};

  constructor(private ws: WeatherService) {}

  ngOnInit(): void {
    this.ws.getCities().subscribe((c: City[]) => {
      this.allCities = c;
      this.cities = c.filter((x: City) => x.isFavorite);
      this.refreshWeather();
    });
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
        map((w) => ({ key: c.name, value: w }))
      )
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

  toggleFavorite(city: City): void {
    const next = !city.isFavorite;
    this.ws.setFavorite(city.id, next).subscribe({
      next: () => {
        city.isFavorite = next;
        this.cities = this.allCities.filter((c: City) => c.isFavorite);
        this.refreshWeather();
      },
      error: () => {
        // Mantem estado anterior se falhar a chamada da API.
      }
    });
  }

  get avgTemp(): number {
    if (!this.cities.length) return 0;
    const temps = this.cities
      .map((c: City) => this.getWeather(c.name)?.temperature)
      .filter((x): x is number => typeof x === 'number');
    if (!temps.length) return 0;
    return Math.round(temps.reduce((a: number, b: number) => a + b, 0) / temps.length);
  }

  get uniqueCountryCount(): number {
    return new Set(this.cities.map((c: City) => c.country)).size;
  }
}

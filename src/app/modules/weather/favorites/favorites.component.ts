import { Component, OnInit } from '@angular/core';
import { WeatherService } from '../../../shared/services/weather.service';
import { City } from '../../../shared/models/weather.model';

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

  mockTemps: Record<string, { temp: number; condition: string; icon: string; humidity: number; wind: number }> = {
    'Luanda':       { temp: 28, condition: 'Parcialmente Nublado', icon: 'partly_cloudy_day', humidity: 74, wind: 14 },
    'Lisboa':       { temp: 19, condition: 'Céu Limpo',            icon: 'wb_sunny',          humidity: 55, wind: 10 },
    'Porto':        { temp: 16, condition: 'Chuva Fraca',          icon: 'rainy',             humidity: 88, wind: 18 },
    'São Paulo':    { temp: 29, condition: 'Ensolarado',           icon: 'wb_sunny',          humidity: 62, wind:  8 },
    'Rio de Janeiro':{ temp: 31, condition: 'Ensolarado',          icon: 'wb_sunny',          humidity: 70, wind: 12 },
    'Braga':        { temp: 14, condition: 'Nublado',              icon: 'cloud',             humidity: 80, wind: 15 },
    'Funchal':      { temp: 22, condition: 'Parcialmente Nublado', icon: 'partly_cloudy_day', humidity: 60, wind:  9 },
  };

  constructor(private ws: WeatherService) {}

  ngOnInit(): void {
    this.ws.getCities().subscribe((c: City[]) => {
      this.allCities = c;
      this.cities = c.filter((x: City) => x.isFavorite);
      this.loading = false;
    });
  }

  getWeather(city: string) {
    return this.mockTemps[city] || { temp: 20, condition: 'N/A', icon: 'cloud', humidity: 60, wind: 10 };
  }

  toggleFavorite(city: City): void {
    const next = !city.isFavorite;
    this.ws.setFavorite(city.id, next).subscribe({
      next: () => {
        city.isFavorite = next;
        this.cities = this.allCities.filter((c: City) => c.isFavorite);
      },
      error: () => {
        // Mantem estado anterior se falhar a chamada da API.
      }
    });
  }

  get avgTemp(): number {
    if (!this.cities.length) return 0;
    const temps = this.cities.map((c: City) => this.getWeather(c.name).temp);
    return Math.round(temps.reduce((a: number, b: number) => a + b, 0) / temps.length);
  }

  get uniqueCountryCount(): number {
    return new Set(this.cities.map((c: City) => c.country)).size;
  }
}

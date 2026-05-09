import { Component, OnInit } from '@angular/core';
import { WeatherService } from '../../shared/services/weather.service';
import { WeatherData, HourlyForecast, DailyForecast } from '../../shared/models/weather.model';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  weather!: WeatherData;
  hourly: HourlyForecast[] = [];
  daily: DailyForecast[] = [];
  loading = true;

  constructor(private ws: WeatherService) {}

  ngOnInit(): void {
    this.ws.getCurrentWeather().subscribe(w => {
      this.weather = w;
      this.loading = false;
    });
    this.ws.getHourlyForecast().subscribe(h => this.hourly = h);
    this.ws.getDailyForecast().subscribe(d => this.daily = d);
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
    if (uv <= 2) return 'Baixo';
    if (uv <= 5) return 'Moderado';
    if (uv <= 7) return 'Alto';
    return 'Muito Alto';
  }

  getUvWidth(uv: number): string {
    return Math.min((uv / 11) * 100, 100) + '%';
  }
}

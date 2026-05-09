import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { WeatherService } from '../../../shared/services/weather.service';
import { WeatherData, HourlyForecast, DailyForecast } from '../../../shared/models/weather.model';

@Component({
  selector: 'app-city-detail',
  template: `
    <div class="animate-in" *ngIf="weather">
      <div class="page-header" style="margin-bottom:24px">
        <div>
          <h1 class="text-headline-xl">{{ weather.city }}</h1>
          <p class="text-body-sm text-muted">{{ weather.country }} · {{ weather.condition }}</p>
        </div>
        <button class="btn-glass" routerLink="/dashboard">
          <span class="material-symbols-outlined">arrow_back</span> Voltar
        </button>
      </div>
      <div class="glass-card" style="padding:32px;text-align:center">
        <span class="text-display" style="font-size:96px;font-weight:200;color:var(--primary)">{{ weather.temperature }}°</span>
        <p class="text-headline-md" style="margin-top:12px;color:var(--on-surface-variant)">{{ weather.condition }}</p>
      </div>
    </div>
  `,
  styles: [`.page-header{display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:12px}`]
})
export class CityDetailComponent implements OnInit {
  weather!: WeatherData;
  constructor(private ws: WeatherService, private route: ActivatedRoute) {}
  ngOnInit(): void {
    const city = this.route.snapshot.paramMap.get('city') || 'Luanda';
    this.ws.getCurrentWeather(city).subscribe((w: WeatherData) => this.weather = w);
  }
}

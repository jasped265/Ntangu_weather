import { Component, OnInit } from '@angular/core';
import { WeatherService } from '../../shared/services/weather.service';
import { User, City, WeatherAlert } from '../../shared/models/weather.model';

@Component({
  selector: 'app-backoffice',
  templateUrl: './backoffice.component.html',
  styleUrls: ['./backoffice.component.scss']
})
export class BackofficeComponent implements OnInit {
  users: User[] = [];
  cities: City[] = [];
  alerts: WeatherAlert[] = [];
  loading = true;

  showUserModal = false;
  showCityModal = false;
  newUser = { name: '', email: '', role: 'user' as 'admin'|'user', plan: 'free' as 'free'|'premium'|'pro' };
  newCity = { name: '', country: '', lat: 0, lon: 0 };

  stats = [
    { label: 'Total Usuários', value: '12,482', icon: 'group', delta: '+14% este mês', deltaPositive: true },
    { label: 'Cidades Ativas', value: '842', icon: 'location_city', delta: '4 novas hoje', deltaPositive: true },
    { label: 'Sensores Online', value: '3,105', icon: 'sensors', delta: '98.2% disponibilidade', deltaPositive: true },
    { label: 'Receita (EUR)', value: '€42,1k', icon: 'payments', delta: 'Meta alcançada', deltaPositive: true },
  ];

  constructor(private ws: WeatherService) {}

  ngOnInit(): void {
    this.ws.getUsers().subscribe(u => { this.users = u; this.loading = false; });
    this.ws.getCities().subscribe(c => this.cities = c);
    this.ws.getAlerts().subscribe(a => this.alerts = a);
  }

  deleteUser(id: string): void {
    if (confirm('Remover este usuário?')) {
      this.ws.deleteUser(id).subscribe(() => this.users = this.users.filter(u => u.id !== id));
    }
  }

  deleteCity(id: string): void {
    if (confirm('Remover esta cidade?')) {
      this.ws.deleteCity(id).subscribe(() => this.cities = this.cities.filter(c => c.id !== id));
    }
  }

  addUser(): void {
    this.ws.addUser(this.newUser).subscribe(u => {
      this.users.push(u);
      this.showUserModal = false;
      this.newUser = { name: '', email: '', role: 'user', plan: 'free' };
    });
  }

  addCity(): void {
    this.ws.addCity(this.newCity).subscribe(c => {
      this.cities.push(c);
      this.showCityModal = false;
      this.newCity = { name: '', country: '', lat: 0, lon: 0 };
    });
  }
}

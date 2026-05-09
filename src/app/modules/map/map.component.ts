import { Component } from '@angular/core';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent {
  layers = [
    { id: 'wind', label: 'Partículas de Vento', icon: 'air', active: true, color: 'var(--primary)' },
    { id: 'temp', label: 'Temperatura', icon: 'thermostat', active: false, color: 'var(--tertiary)' },
    { id: 'rain', label: 'Precipitação', icon: 'rainy', active: false, color: 'var(--secondary)' },
    { id: 'cloud', label: 'Cobertura de Nuvens', icon: 'cloud', active: false, color: 'var(--on-surface-variant)' },
  ];

  selectedTime = '18:00';
  times = ['Agora', '12:00', '15:00', '18:00', '21:00', '00:00', '03:00'];
  precision = 75;

  toggleLayer(layer: any): void { layer.active = !layer.active; }
}

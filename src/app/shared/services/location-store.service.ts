import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { LocationResult } from './weather.service';

export interface SelectedLocation {
  name: string;
  country?: string;
  lat?: number;
  lon?: number;
}

@Injectable({ providedIn: 'root' })
export class LocationStoreService {
  private readonly storageKey = 'ntangu_selected_location';

  private readonly selectedSubject = new BehaviorSubject<SelectedLocation>(this.loadInitial());
  readonly selected$ = this.selectedSubject.asObservable();

  get selected(): SelectedLocation {
    return this.selectedSubject.value;
  }

  setLocation(loc: LocationResult): void {
    const next: SelectedLocation = {
      name: loc.name,
      country: loc.country,
      lat: loc.lat,
      lon: loc.lon,
    };
    this.persist(next);
    this.selectedSubject.next(next);
  }

  setCityName(name: string): void {
    const next: SelectedLocation = { ...this.selected, name };
    this.persist(next);
    this.selectedSubject.next(next);
  }

  private loadInitial(): SelectedLocation {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return { name: 'Luanda' };
      const parsed = JSON.parse(raw) as SelectedLocation;
      if (!parsed?.name) return { name: 'Luanda' };
      return parsed;
    } catch {
      return { name: 'Luanda' };
    }
  }

  private persist(value: SelectedLocation): void {
    localStorage.setItem(this.storageKey, JSON.stringify(value));
  }
}


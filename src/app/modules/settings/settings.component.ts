import { Component, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import {
  ThemeService,
  I18nService,
  UnitsService,
  TempUnit,
} from '../../shared/services/theme.service';
import { AuthService } from '../../shared/services/auth.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent implements OnInit, OnDestroy {
  notifications = { email: true, push: true, alerts: true };

  /** Keys for Pro features — translated via i18n.t() in the template */
  readonly proFeatureKeys = [
    'settings.proFeature1',
    'settings.proFeature2',
    'settings.proFeature3',
    'settings.proFeature4',
    'settings.proFeature5',
  ];

  private readonly destroy$ = new Subject<void>();

  constructor(
    public theme: ThemeService,
    public i18n: I18nService,
    public units: UnitsService,
    public auth: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // Re-render when language changes (t() is a method, not a pipe)
    this.i18n.lang$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.cdr.markForCheck();
    });
    // Re-render when unit changes (units.current is a getter, not Observable)
    this.units.unit$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setUnit(unit: TempUnit): void {
    this.units.setUnit(unit);
  }
}

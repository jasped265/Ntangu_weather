import { Component, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { I18nService } from '../../services/theme.service';
import { Subject, takeUntil } from 'rxjs';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  adminOnly?: boolean;
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
})
export class SidebarComponent implements OnInit, OnDestroy {
  navItems: NavItem[] = [
    { label: 'nav.dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'nav.map', icon: 'map', route: '/map' },
    { label: 'nav.favorites', icon: 'favorite', route: '/favorites' },
    { label: 'nav.history', icon: 'history', route: '/history' },
    {
      label: 'nav.reports',
      icon: 'analytics',
      route: '/reports',
      adminOnly: true,
    },
    {
      label: 'nav.backoffice',
      icon: 'admin_panel_settings',
      route: '/backoffice',
      adminOnly: true,
    },
    { label: 'nav.settings', icon: 'settings', route: '/settings' },
  ];

  private readonly destroy$ = new Subject<void>();

  constructor(
    public auth: AuthService,
    public router: Router,
    public i18n: I18nService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // Force re-render when language changes so nav labels update immediately
    this.i18n.lang$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  isActive(route: string): boolean {
    return this.router.url.startsWith(route);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }

  get visibleItems(): NavItem[] {
    return this.navItems.filter(
      (item) => !item.adminOnly || this.auth.isAdmin(),
    );
  }
}

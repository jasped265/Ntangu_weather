import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-bottom-nav',
  template: `
    <nav class="bottom-nav">
      <a class="bottom-nav-item" [class.active]="r.url.startsWith('/dashboard')" routerLink="/dashboard">
        <span class="material-symbols-outlined" [class.icon-fill]="r.url.startsWith('/dashboard')">dashboard</span>
        <span>Home</span>
      </a>
      <a class="bottom-nav-item" [class.active]="r.url.startsWith('/map')" routerLink="/map">
        <span class="material-symbols-outlined" [class.icon-fill]="r.url.startsWith('/map')">map</span>
        <span>Mapa</span>
      </a>
      <a class="bottom-nav-item" [class.active]="r.url.startsWith('/favorites')" routerLink="/favorites">
        <span class="material-symbols-outlined" [class.icon-fill]="r.url.startsWith('/favorites')">favorite</span>
        <span>Favoritos</span>
      </a>
      <a class="bottom-nav-item" [class.active]="r.url.startsWith('/settings')" routerLink="/settings">
        <span class="material-symbols-outlined" [class.icon-fill]="r.url.startsWith('/settings')">settings</span>
        <span>Ajustes</span>
      </a>
    </nav>
  `,
  styles: [`
    .bottom-nav {
      display: none;
      position: fixed;
      bottom: 0; left: 0; right: 0;
      background: var(--glass-bg);
      backdrop-filter: blur(40px);
      border-top: 1px solid var(--glass-border);
      z-index: 200;
      padding: 10px 0 calc(10px + env(safe-area-inset-bottom));
      @media (max-width: 768px) { display: flex; }
    }
    .bottom-nav-item {
      flex: 1; display: flex; flex-direction: column; align-items: center;
      gap: 4px; text-decoration: none; color: var(--on-surface-variant);
      font-size: 10px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase;
      transition: color 0.2s;
      &.active { color: var(--primary); }
      .material-symbols-outlined { font-size: 22px; }
    }
  `]
})
export class BottomNavComponent {
  constructor(public r: Router) {}
}

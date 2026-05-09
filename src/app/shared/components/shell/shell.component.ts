import { Component } from '@angular/core';

@Component({
  selector: 'app-shell',
  template: `
    <div class="main-layout">
      <app-sidebar></app-sidebar>
      <div class="content-area">
        <app-topbar></app-topbar>
        <div class="page-content">
          <router-outlet></router-outlet>
        </div>
      </div>
      <app-bottom-nav></app-bottom-nav>
    </div>
  `
})
export class ShellComponent {}

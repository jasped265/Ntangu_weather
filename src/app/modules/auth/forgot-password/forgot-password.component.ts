import { Component } from '@angular/core';
import { ThemeService } from '../../../shared/services/theme.service';

@Component({
  selector: 'app-forgot-password',
  styleUrls: ['../login/login.component.scss'],
  template: `
    <div class="auth-page">
      <div class="auth-bg">
        <div class="bg-blob blob-1"></div>
        <div class="bg-blob blob-2"></div>
        <div class="bg-grid"></div>
      </div>
      <div class="auth-container animate-in">
        <div class="auth-brand">
          <div class="brand-pill">
            <span class="material-symbols-outlined icon-fill" style="color:var(--primary)">lock_reset</span>
            <span class="text-label" style="color:var(--primary)">Recuperar Senha</span>
          </div>
        </div>
        <div class="auth-card glass-xl">
          <div class="auth-header">
            <h1 class="text-headline-xl">Recuperar Senha</h1>
            <p class="text-body-sm text-muted">Insira seu e-mail para receber as instruções de redefinição.</p>
          </div>
          <div class="auth-form" *ngIf="!sent">
            <div class="field-group">
              <label class="form-label">E-mail</label>
              <div class="input-with-icon">
                <span class="material-symbols-outlined input-icon">mail</span>
                <input class="input-glass" type="email" [(ngModel)]="email" placeholder="seu@email.com" (keyup.enter)="send()"/>
              </div>
            </div>
            <button class="btn-primary login-btn" (click)="send()">
              Enviar Instruções <span class="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
          <div class="success-state" *ngIf="sent">
            <div class="success-icon">
              <span class="material-symbols-outlined icon-fill" style="color:var(--tertiary);font-size:40px">mark_email_read</span>
            </div>
            <p class="text-body-lg" style="text-align:center;margin-top:12px">Instruções enviadas para <strong>{{ email }}</strong></p>
          </div>
          <a class="btn-glass" style="justify-content:center;margin-top:20px;width:100%;text-decoration:none" routerLink="/auth/login">
            <span class="material-symbols-outlined">arrow_back</span> Voltar ao Login
          </a>
        </div>
      </div>
    </div>
  `
})
export class ForgotPasswordComponent {
  email = '';
  sent = false;
  constructor(public theme: ThemeService) {}
  send(): void { if (this.email) this.sent = true; }
}

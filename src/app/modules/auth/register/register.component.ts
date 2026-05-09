import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service';
import { ThemeService, I18nService } from '../../../shared/services/theme.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['../login/login.component.scss']
})
export class RegisterComponent {
  name = '';
  email = '';
  password = '';
  agreed = false;
  loading = false;
  error = '';

  constructor(
    private auth: AuthService,
    private router: Router,
    public theme: ThemeService,
    public i18n: I18nService
  ) {}

  register(): void {
    if (!this.agreed) { this.error = 'Aceite os Termos de Serviço para continuar.'; return; }
    this.error = '';
    this.loading = true;
    this.auth.register(this.name, this.email, this.password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: () => { this.error = 'Erro ao criar conta.'; this.loading = false; }
    });
  }

  get passwordStrength(): number {
    if (!this.password) return 0;
    let score = 0;
    if (this.password.length >= 8) score++;
    if (/[A-Z]/.test(this.password)) score++;
    if (/[0-9]/.test(this.password)) score++;
    if (/[^A-Za-z0-9]/.test(this.password)) score++;
    return score;
  }

  get strengthLabel(): string {
    const labels = ['', 'Fraca', 'Média', 'Boa', 'Forte'];
    return labels[this.passwordStrength] || '';
  }
}

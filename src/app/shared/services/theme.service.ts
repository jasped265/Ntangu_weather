import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Theme = 'dark' | 'light';
export type Language = 'pt' | 'en';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private themeSubject = new BehaviorSubject<Theme>(
    (localStorage.getItem('ntangu_theme') as Theme) || 'dark'
  );
  theme$ = this.themeSubject.asObservable();

  constructor() {
    this.applyTheme(this.themeSubject.value);
  }

  toggleTheme(): void {
    const next: Theme = this.themeSubject.value === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
  }

  setTheme(theme: Theme): void {
    localStorage.setItem('ntangu_theme', theme);
    this.themeSubject.next(theme);
    this.applyTheme(theme);
  }

  get isDark(): boolean { return this.themeSubject.value === 'dark'; }

  private applyTheme(theme: Theme): void {
    document.body.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark-theme');
      document.documentElement.classList.remove('light-theme');
    } else {
      document.documentElement.classList.add('light-theme');
      document.documentElement.classList.remove('dark-theme');
    }
  }
}

@Injectable({ providedIn: 'root' })
export class I18nService {
  private langSubject = new BehaviorSubject<Language>(
    (localStorage.getItem('ntangu_lang') as Language) || 'pt'
  );
  lang$ = this.langSubject.asObservable();

  private translations: Record<Language, Record<string, string>> = {
    pt: {
      'nav.dashboard': 'Dashboard',
      'nav.map': 'Mapa Interativo',
      'nav.backoffice': 'Backoffice',
      'nav.history': 'Dados Históricos',
      'nav.settings': 'Definições',
      'nav.favorites': 'Favoritos',
      'nav.reports': 'Relatórios',
      'weather.humidity': 'Humidade',
      'weather.wind': 'Vento',
      'weather.uv': 'Índice UV',
      'weather.air': 'Qualidade do Ar',
      'weather.feels_like': 'Sensação Térmica',
      'weather.sunrise': 'Nascer',
      'weather.sunset': 'Pôr do Sol',
      'weather.hourly': 'Previsão por Hora',
      'weather.weekly': 'Próximos 7 Dias',
      'auth.login': 'Entrar',
      'auth.register': 'Criar Conta',
      'auth.email': 'E-mail',
      'auth.password': 'Senha',
      'auth.forgot': 'Esqueceu a senha?',
      'auth.no_account': 'Não tem uma conta?',
      'upgrade': 'Upgrade to Pro',
      'search': 'Pesquisar cidade...',
    },
    en: {
      'nav.dashboard': 'Dashboard',
      'nav.map': 'Interactive Map',
      'nav.backoffice': 'Backoffice',
      'nav.history': 'Historical Data',
      'nav.settings': 'Settings',
      'nav.favorites': 'Favorites',
      'nav.reports': 'Reports',
      'weather.humidity': 'Humidity',
      'weather.wind': 'Wind',
      'weather.uv': 'UV Index',
      'weather.air': 'Air Quality',
      'weather.feels_like': 'Feels Like',
      'weather.sunrise': 'Sunrise',
      'weather.sunset': 'Sunset',
      'weather.hourly': 'Hourly Forecast',
      'weather.weekly': 'Next 7 Days',
      'auth.login': 'Sign In',
      'auth.register': 'Create Account',
      'auth.email': 'E-mail',
      'auth.password': 'Password',
      'auth.forgot': 'Forgot password?',
      'auth.no_account': "Don't have an account?",
      'upgrade': 'Upgrade to Pro',
      'search': 'Search city...',
    }
  };

  get currentLang(): Language { return this.langSubject.value; }

  setLang(lang: Language): void {
    localStorage.setItem('ntangu_lang', lang);
    this.langSubject.next(lang);
  }

  toggleLang(): void {
    this.setLang(this.currentLang === 'pt' ? 'en' : 'pt');
  }

  t(key: string): string {
    return this.translations[this.currentLang][key] || key;
  }
}

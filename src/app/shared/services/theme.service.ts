import { Injectable, ChangeDetectorRef } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Theme = 'dark' | 'light';
export type Language = 'pt' | 'en';
export type TempUnit = 'celsius' | 'fahrenheit';

// ─────────────────────────────────────────────────────────────────────────────
// ThemeService
// ─────────────────────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private themeSubject = new BehaviorSubject<Theme>(
    (localStorage.getItem('ntangu_theme') as Theme) || 'dark',
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

  get isDark(): boolean {
    return this.themeSubject.value === 'dark';
  }

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

// ─────────────────────────────────────────────────────────────────────────────
// UnitsService — partilhado globalmente para conversão de temperatura
// ─────────────────────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class UnitsService {
  private unitSubject = new BehaviorSubject<TempUnit>(
    (localStorage.getItem('ntangu_units') as TempUnit) || 'celsius',
  );
  unit$ = this.unitSubject.asObservable();

  get current(): TempUnit {
    return this.unitSubject.value;
  }
  get isCelsius(): boolean {
    return this.unitSubject.value === 'celsius';
  }

  setUnit(unit: TempUnit): void {
    localStorage.setItem('ntangu_units', unit);
    this.unitSubject.next(unit);
  }

  // Converte de Celsius (valor vindo da API) para a unidade atual
  convert(celsius: number): number {
    return this.isCelsius
      ? Math.round(celsius)
      : Math.round((celsius * 9) / 5 + 32);
  }

  // Label para mostrar na UI: "23°C" ou "73°F"
  format(celsius: number): string {
    return `${this.convert(celsius)}°${this.isCelsius ? 'C' : 'F'}`;
  }

  // Símbolo apenas: "°C" ou "°F"
  get symbol(): string {
    return this.isCelsius ? '°C' : '°F';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// I18nService — agora com BehaviorSubject reativo
// ─────────────────────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class I18nService {
  private langSubject = new BehaviorSubject<Language>(
    (localStorage.getItem('ntangu_lang') as Language) || 'pt',
  );
  lang$ = this.langSubject.asObservable();

  private translations: Record<Language, Record<string, string>> = {
    // ── PATCH: adicionar estas chaves ao objeto `translations` dentro do I18nService
    // Localização: theme.service.ts → classe I18nService → propriedade translations

    // ─── PT ───────────────────────────────────────────────────────────────────────
    pt: {
      // Já existentes (weather, settings, etc.) — mantém os que já tens

      // Common
      'common.loading': 'A carregar...',
      'common.retry': 'Tentar novamente',
      'common.cancel': 'Cancelar',
      'common.edit': 'Editar',
      'common.delete': 'Remover',

      'reports.itemTitle': 'Relatório',
      'reports.types.weather_summary': 'Resumo do tempo',

      // Reports
      'reports.title': 'Relatórios e Análises',
      'reports.export_csv': 'Exportar CSV',
      'reports.generate': 'Gerar Relatório',
      'reports.generating': 'A gerar...',
      'reports.summary_title': 'Resumo Operacional',
      'reports.users': 'Utilizadores',
      'reports.cities': 'Cidades',
      'reports.reports': 'Relatórios',
      'reports.updated': 'Atualizado',
      'reports.generated_list': 'Relatórios Gerados',
      'reports.report_count': 'relatório(s)',
      'reports.empty': 'Nenhum relatório gerado ainda',
      'reports.download_csv': 'Descarregar CSV',
      'reports.download_pdf': 'Descarregar PDF',
      'reports.generated_ok': 'Relatório gerado com sucesso',
      'reports.generated_err': 'Erro ao gerar relatório',
      'reports.csv_ok': 'CSV exportado com sucesso',
      'reports.csv_err': 'Erro ao exportar CSV',
      'reports.download_ok': 'descarregado com sucesso',
      'reports.download_err': 'Erro ao exportar',
      'reports.id_err': 'Erro: ID do relatório não encontrado',

      // History
      'history.title': 'Dados Históricos',
      'history.subtitle': 'Padrões climáticos reais via Open-Meteo',
      'history.error_title': 'Não foi possível carregar os dados',
      'history.error_sub': 'Verifica a tua ligação à internet',
      'history.stat_max': 'Máxima',
      'history.stat_min': 'Mínima',
      'history.stat_avg': 'Média',
      'history.stat_total': 'Total',
      'history.stat_range': 'Amplitude',
      'history.monthly_avg': 'Médias mensais',
      'history.daily_data': 'Dados diários',
      'history.loading_data': 'A carregar dados reais...',
      'history.monthly_summary': 'Resumo Mensal',
      'history.daily_title': 'Dados Diários',
      'history.records': 'registos',
      'history.col_date': 'Data',
      'history.col_condition': 'Condição',
      'history.col_temp_max': 'Temp. Máx',
      'history.col_temp_min': 'Temp. Mín',
      'history.col_rain': 'Precipitação',

      // Backoffice
      'backoffice.title': 'Backoffice',
      'backoffice.subtitle': 'Gestão administrativa do ecossistema Ntangu.',
      'backoffice.stat_users': 'Total Usuários',
      'backoffice.stat_cities': 'Cidades Ativas',
      'backoffice.stat_sensors': 'Sensores Online',
      'backoffice.stat_alerts': 'Alertas Ativos',
      'backoffice.total': 'no total',
      'backoffice.city_count': 'cidade(s)',
      'backoffice.stable': 'estáveis',
      'backoffice.critical': 'crítico(s)',
      'backoffice.manage_users': 'Gerenciar Usuários',
      'backoffice.new_user': 'Novo Usuário',
      'backoffice.col_name': 'Nome',
      'backoffice.col_status': 'Status',
      'backoffice.col_plan': 'Plano',
      'backoffice.col_role': 'Papel',
      'backoffice.col_actions': 'Ações',
      'backoffice.active': 'Ativo',
      'backoffice.inactive': 'Inativo',
      'backoffice.showing': 'Mostrando',
      'backoffice.of': 'de',
      'backoffice.users': 'usuários',
      'backoffice.recent_alerts': 'Alertas Recentes',
      'backoffice.monitored_cities': 'Cidades Monitoradas',
      'backoffice.cities_subtitle':
        'Gestão de thresholds e notificações por localidade.',
      'backoffice.new_city': 'Nova Cidade',
      'backoffice.sensors': 'sensores',
      'backoffice.confirm_delete_user': 'Remover este usuário?',
      'backoffice.confirm_delete_city': 'Remover esta cidade?',
      'backoffice.field_name': 'Nome',
      'backoffice.field_name_ph': 'Nome completo',
      'backoffice.field_email': 'E-mail',
      'backoffice.field_role': 'Papel',
      'backoffice.role_user': 'Usuário',
      'backoffice.role_admin': 'Administrador',
      'backoffice.field_plan': 'Plano',
      'backoffice.create_user': 'Criar Usuário',
      'backoffice.field_city_name': 'Nome da Cidade',
      'backoffice.field_country': 'País',
      'backoffice.field_lat': 'Latitude',
      'backoffice.field_lon': 'Longitude',
      'backoffice.add_city': 'Adicionar Cidade',
      'backoffice.export_ok': 'Exportado com sucesso', // pt

      // Map
      'map.title': 'Mapa Interativo',
      'map.subtitle': 'Visualize dados atmosféricos em tempo real',
      'map.live_label': 'Live · Radar de Vento',
      'map.viewing': 'Visualizando',
      'map.layers': 'Camadas',
      'map.layer_wind': 'Partículas de Vento',
      'map.layer_temp': 'Temperatura',
      'map.layer_rain': 'Precipitação',
      'map.layer_cloud': 'Cobertura de Nuvens',
      'map.precision': 'Precisão Visual',
      'map.precision_low': 'Baixa',
      'map.precision_high': 'Ultra HD',
      'map.current_data': 'Dados Atuais',
      'map.avg_wind': 'Velocidade Média',
      'map.pressure': 'Pressão',

      // Weather (já deves ter alguns, adiciona os que faltam)
      'weather.temperature': 'Temperatura',
      'weather.humidity': 'Humidade',
      'weather.wind': 'Vento',
      'weather.feels_like': 'Sensação',
      'weather.low': 'Mín',
      'weather.high': 'Máx',
      'weather.uv': 'Índice UV',
      'weather.air': 'Qualidade do Ar',
      'weather.hourly': 'Previsão por Hora',
      'weather.weekly': 'Próximos 7 Dias',
      'weather.sunrise': 'Nascer do Sol',
      'weather.sunset': 'Pôr do Sol',
      // Brand
      'brand.tagline': 'Inteligência Atmosférica',

      // Navigation (sidebar + bottom-nav)
      'nav.dashboard': 'Início',
      'nav.map': 'Mapa',
      'nav.favorites': 'Favoritos',
      'nav.history': 'Histórico',
      'nav.reports': 'Relatórios',
      'nav.backoffice': 'Backoffice',
      'nav.settings': 'Definições',

      // ── UV labels ────────────────────────────────────────────────────────────
      'uv.low': 'Baixo',
      'uv.moderate': 'Moderado',
      'uv.high': 'Alto',
      'uv.veryHigh': 'Muito Alto',

      // Sidebar user card
      'sidebar.roleAdmin': 'Administrador',
      'sidebar.roleUser': 'Usuário',
      'sidebar.upgradePro': 'Upgrade para Pro',
      'sidebar.logout': 'Sair',

      // Topbar
      search: 'Pesquisar cidade...',

      // Settings
      'settings.title': 'Definições',
      'settings.subtitle': 'Gerencie as suas preferências do Ntangu.',
      'settings.profile': 'Perfil',
      'settings.name': 'Nome',
      'settings.email': 'E-mail',
      'settings.appearance': 'Aparência',
      'settings.darkMode': 'Modo Escuro',
      'settings.darkModeDesc': 'Interface escura para uso noturno',
      'settings.language': 'Idioma',
      'settings.languageDesc': 'Português ou Inglês',
      'settings.tempUnit': 'Unidades de Temperatura',
      'settings.tempUnitDesc': 'Celsius ou Fahrenheit',
      'settings.notifications': 'Notificações',
      'settings.emailAlerts': 'Alertas por E-mail',
      'settings.emailAlertsDesc': 'Receba alertas meteorológicos',
      'settings.pushNotif': 'Notificações Push',
      'settings.pushNotifDesc': 'Notificações no browser',
      'settings.criticalAlerts': 'Alertas Críticos',
      'settings.criticalAlertsDesc': 'Tempestades e eventos severos',
      'settings.proTitle': 'Upgrade para Pro',
      'settings.proSubtitle': 'Acesso ilimitado a todas as funcionalidades',
      'settings.proFeature1': 'Radar em tempo real',
      'settings.proFeature2': 'Previsão 14 dias',
      'settings.proFeature3': 'Exportação ilimitada',
      'settings.proFeature4': 'API Access',
      'settings.proFeature5': 'Suporte prioritário',
      'settings.proButton': 'Assinar Pro — €9,99/mês',

      'dashboard.mapConnected': 'Mapa conectado',
      'dashboard.coordinates': 'Coordenadas',
      'dashboard.mapDesc':
        'Use o mapa para selecionar outra localização e atualizar toda a UI em tempo real.',
      'dashboard.openMap': 'Abrir mapa funcional',
      'dashboard.dewPoint': 'Ponto de orvalho',
      'dashboard.sunMoon': 'Sol & Lua',

      // ── History — tabs & ranges ──────────────────────────────────────────────
      'history.tab_temp': 'Temperatura',
      'history.tab_rain': 'Precipitação',
      'history.tab_humidity': 'Humidade',
      'history.tab_wind': 'Vento',
      'history.range_30d': '30 dias',
      'history.range_90d': '3 meses',
      'history.range_1y': '1 ano',
      'history.range_5y': '5 anos',

      // ── History — conditions (conditionFromRain) ─────────────────────────────
      'history.cond_rainy': 'Chuvoso',
      'history.cond_shower': 'Aguaceiro',
      'history.cond_sunny': 'Ensolarado',
      'history.cond_cloudy': 'Nublado',

      // Favorites
      'favorites.title': 'Cidades Favoritas',
      'favorites.subtitle':
        'Acompanhe as condições climáticas dos seus locais salvos.',
      'favorites.addCity': 'Adicionar Cidade',
      'favorites.allCities': 'Todas as Cidades',
      'favorites.mainLocation': 'Localização Principal',
      'favorites.newDestination': 'Novo Destino',
      'favorites.searchDesc': 'Pesquise cidades ao redor do mundo',
      'favorites.insights': 'Insights dos Favoritos',
      'favorites.avgTemp': 'Temperatura Média',
      'favorites.savedCities': 'Cidades Salvas',
      'favorites.countries': 'Países',
      'favorites.avgUv': 'Índice UV Médio',

      'favorites.empty_title': 'Sem cidades favoritas',
      'favorites.empty_sub': 'Pesquisa e adiciona a tua primeira cidade.',
      'favorites.no_cities': 'Ainda não há cidades registadas.',
      'favorites.modal_title': 'Adicionar Cidade',
      'favorites.modal_sub':
        'Pesquisa uma cidade e confirma para adicionar aos favoritos.',
      'favorites.search_placeholder': 'Pesquisar cidade... (ex: Luanda)',
      'favorites.no_results': 'Nenhuma cidade encontrada.',
      'favorites.search_error': 'Erro ao pesquisar. Tenta novamente.',
      'favorites.confirm_add': 'Adicionar aos Favoritos',
      'favorites.already_fav': 'Esta cidade já está nos favoritos.',
      'favorites.add_error': 'Não foi possível adicionar a cidade.',
      'favorites.fav_error': 'Cidade criada mas não foi possível favoritar.',

      'days.mon': 'SEG',
      'days.tue': 'TER',
      'days.wed': 'QUA',
      'days.thu': 'QUI',
      'days.fri': 'SEX',
      'days.sat': 'SÁB',
      'days.sun': 'DOM',
    },

    // ─── EN ───────────────────────────────────────────────────────────────────────
    en: {
      // Common
      'common.loading': 'Loading...',
      'common.retry': 'Try again',
      'common.cancel': 'Cancel',
      'common.edit': 'Edit',
      'common.delete': 'Delete',

      'reports.itemTitle': 'Report',
      'reports.types.weather_summary': 'Weather summary',

      'days.mon': 'MON',
      'days.tue': 'TUE',
      'days.wed': 'WED',
      'days.thu': 'THU',
      'days.fri': 'FRI',
      'days.sat': 'SAT',
      'days.sun': 'SUN',

      // ── Dashboard ────────────────────────────────────────────────────────────
      'dashboard.mapConnected': 'Connected map',
      'dashboard.coordinates': 'Coordinates',
      'dashboard.mapDesc':
        'Use the map to select another location and update the UI in real time.',
      'dashboard.openMap': 'Open interactive map',
      'dashboard.dewPoint': 'Dew point',
      'dashboard.sunMoon': 'Sun & Moon',

      // ── History — tabs & ranges ──────────────────────────────────────────────
      'history.tab_temp': 'Temperature',
      'history.tab_rain': 'Precipitation',
      'history.tab_humidity': 'Humidity',
      'history.tab_wind': 'Wind',
      'history.range_30d': '30 days',
      'history.range_90d': '3 months',
      'history.range_1y': '1 year',
      'history.range_5y': '5 years',

      // ── History — conditions ─────────────────────────────────────────────────
      'history.cond_rainy': 'Rainy',
      'history.cond_shower': 'Shower',
      'history.cond_sunny': 'Sunny',
      'history.cond_cloudy': 'Cloudy',

      // Reports
      'reports.title': 'Reports & Analytics',
      'reports.export_csv': 'Export CSV',
      'reports.generate': 'Generate Report',
      'reports.generating': 'Generating...',
      'reports.summary_title': 'Operational Summary',
      'reports.users': 'Users',
      'reports.cities': 'Cities',
      'reports.reports': 'Reports',
      'reports.updated': 'Updated',
      'reports.generated_list': 'Generated Reports',
      'reports.report_count': 'report(s)',
      'reports.empty': 'No reports generated yet',
      'reports.download_csv': 'Download CSV',
      'reports.download_pdf': 'Download PDF',
      'reports.generated_ok': 'Report generated successfully',
      'reports.generated_err': 'Error generating report',
      'reports.csv_ok': 'CSV exported successfully',
      'reports.csv_err': 'Error exporting CSV',
      'reports.download_ok': 'downloaded successfully',
      'reports.download_err': 'Error exporting',
      'reports.id_err': 'Error: report ID not found',

      // History
      'history.title': 'Historical Data',
      'history.subtitle': 'Real climate patterns via Open-Meteo',
      'history.error_title': 'Could not load data',
      'history.error_sub': 'Check your internet connection',
      'history.stat_max': 'Maximum',
      'history.stat_min': 'Minimum',
      'history.stat_avg': 'Average',
      'history.stat_total': 'Total',
      'history.stat_range': 'Range',
      'history.monthly_avg': 'Monthly averages',
      'history.daily_data': 'Daily data',
      'history.loading_data': 'Loading real data...',
      'history.monthly_summary': 'Monthly Summary',
      'history.daily_title': 'Daily Data',
      'history.records': 'records',
      'history.col_date': 'Date',
      'history.col_condition': 'Condition',
      'history.col_temp_max': 'Max Temp',
      'history.col_temp_min': 'Min Temp',
      'history.col_rain': 'Precipitation',

      // Backoffice
      'backoffice.title': 'Backoffice',
      'backoffice.subtitle':
        'Administrative management of the Ntangu ecosystem.',
      'backoffice.stat_users': 'Total Users',
      'backoffice.stat_cities': 'Active Cities',
      'backoffice.stat_sensors': 'Online Sensors',
      'backoffice.stat_alerts': 'Active Alerts',
      'backoffice.total': 'total',
      'backoffice.city_count': 'city(ies)',
      'backoffice.stable': 'stable',
      'backoffice.critical': 'critical',
      'backoffice.manage_users': 'Manage Users',
      'backoffice.new_user': 'New User',
      'backoffice.col_name': 'Name',
      'backoffice.col_status': 'Status',
      'backoffice.col_plan': 'Plan',
      'backoffice.col_role': 'Role',
      'backoffice.col_actions': 'Actions',
      'backoffice.active': 'Active',
      'backoffice.inactive': 'Inactive',
      'backoffice.showing': 'Showing',
      'backoffice.of': 'of',
      'backoffice.users': 'users',
      'backoffice.recent_alerts': 'Recent Alerts',
      'backoffice.monitored_cities': 'Monitored Cities',
      'backoffice.cities_subtitle':
        'Threshold and notification management by location.',
      'backoffice.new_city': 'New City',
      'backoffice.sensors': 'sensors',
      'backoffice.confirm_delete_user': 'Remove this user?',
      'backoffice.confirm_delete_city': 'Remove this city?',
      'backoffice.field_name': 'Name',
      'backoffice.field_name_ph': 'Full name',
      'backoffice.field_email': 'Email',
      'backoffice.field_role': 'Role',
      'backoffice.role_user': 'User',
      'backoffice.role_admin': 'Administrator',
      'backoffice.field_plan': 'Plan',
      'backoffice.create_user': 'Create User',
      'backoffice.field_city_name': 'City Name',
      'backoffice.field_country': 'Country',
      'backoffice.field_lat': 'Latitude',
      'backoffice.field_lon': 'Longitude',
      'backoffice.add_city': 'Add City',

      // Map
      'map.title': 'Interactive Map',
      'map.subtitle': 'Visualize atmospheric data in real time',
      'map.live_label': 'Live · Wind Radar',
      'map.viewing': 'Viewing',
      'map.layers': 'Layers',
      'map.layer_wind': 'Wind Particles',
      'map.layer_temp': 'Temperature',
      'map.layer_rain': 'Precipitation',
      'map.layer_cloud': 'Cloud Cover',
      'map.precision': 'Visual Precision',
      'map.precision_low': 'Low',
      'map.precision_high': 'Ultra HD',
      'map.current_data': 'Current Data',
      'map.avg_wind': 'Average Speed',
      'map.pressure': 'Pressure',

      // Weather
      'weather.temperature': 'Temperature',
      'weather.humidity': 'Humidity',
      'weather.wind': 'Wind',
      'weather.feels_like': 'Feels like',
      'weather.low': 'Low',
      'weather.high': 'High',
      'weather.uv': 'UV Index',
      'weather.air': 'Air Quality',
      'weather.hourly': 'Hourly Forecast',
      'weather.weekly': 'Next 7 Days',
      'weather.sunrise': 'Sunrise',
      'weather.sunset': 'Sunset',

      // ── UV labels ────────────────────────────────────────────────────────────
      'uv.low': 'Low',
      'uv.moderate': 'Moderate',
      'uv.high': 'High',
      'uv.veryHigh': 'Very High',

      // Brand
      'brand.tagline': 'Atmospheric Intelligence',

      // Navigation
      'nav.dashboard': 'Home',
      'nav.map': 'Map',
      'nav.favorites': 'Favorites',
      'nav.history': 'History',
      'nav.reports': 'Reports',
      'nav.backoffice': 'Backoffice',
      'nav.settings': 'Settings',

      // Sidebar user card
      'sidebar.roleAdmin': 'Administrator',
      'sidebar.roleUser': 'User',
      'sidebar.upgradePro': 'Upgrade to Pro',
      'sidebar.logout': 'Log out',

      // Topbar
      search: 'Search city...',

      // Settings
      'settings.title': 'Settings',
      'settings.subtitle': 'Manage your Ntangu preferences.',
      'settings.profile': 'Profile',
      'settings.name': 'Name',
      'settings.email': 'E-mail',
      'settings.appearance': 'Appearance',
      'settings.darkMode': 'Dark Mode',
      'settings.darkModeDesc': 'Dark interface for night use',
      'settings.language': 'Language',
      'settings.languageDesc': 'Portuguese or English',
      'settings.tempUnit': 'Temperature Units',
      'settings.tempUnitDesc': 'Celsius or Fahrenheit',
      'settings.notifications': 'Notifications',
      'settings.emailAlerts': 'E-mail Alerts',
      'settings.emailAlertsDesc': 'Receive weather alerts',
      'settings.pushNotif': 'Push Notifications',
      'settings.pushNotifDesc': 'Browser notifications',
      'settings.criticalAlerts': 'Critical Alerts',
      'settings.criticalAlertsDesc': 'Storms and severe weather events',
      'settings.proTitle': 'Upgrade to Pro',
      'settings.proSubtitle': 'Unlimited access to all features',
      'settings.proFeature1': 'Real-time radar',
      'settings.proFeature2': '14-day forecast',
      'settings.proFeature3': 'Unlimited export',
      'settings.proFeature4': 'API Access',
      'settings.proFeature5': 'Priority support',
      'settings.proButton': 'Subscribe Pro — €9.99/month',

      // Favorites
      'favorites.title': 'Favorite Cities',
      'favorites.subtitle':
        'Track weather conditions for your saved locations.',
      'favorites.addCity': 'Add City',
      'favorites.allCities': 'All Cities',
      'favorites.mainLocation': 'Main Location',
      'favorites.newDestination': 'New Destination',
      'favorites.searchDesc': 'Search cities around the world',
      'favorites.insights': 'Favorites Insights',
      'favorites.avgTemp': 'Average Temperature',
      'favorites.savedCities': 'Saved Cities',
      'favorites.countries': 'Countries',
      'favorites.avgUv': 'Average UV Index',

      'favorites.empty_title': 'No favorite cities yet',
      'favorites.empty_sub': 'Search and add your first city.',
      'favorites.no_cities': 'No cities registered yet.',
      'favorites.modal_title': 'Add City',
      'favorites.modal_sub':
        'Search a city and confirm to add it to your favorites.',
      'favorites.search_placeholder': 'Search city... (e.g. Luanda)',
      'favorites.no_results': 'No cities found.',
      'favorites.search_error': 'Search error. Please try again.',
      'favorites.confirm_add': 'Add to Favorites',
      'favorites.already_fav': 'This city is already in your favorites.',
      'favorites.add_error': 'Could not add the city.',
      'favorites.fav_error': 'City created but could not be favorited.',

      'backoffice.export_ok': 'Exported successfully', // en
    },
  };

  get currentLang(): Language {
    return this.langSubject.value;
  }

  setLang(lang: Language): void {
    localStorage.setItem('ntangu_lang', lang);
    this.langSubject.next(lang);
  }

  toggleLang(): void {
    this.setLang(this.currentLang === 'pt' ? 'en' : 'pt');
  }

  t(key: string): string {
    return this.translations[this.currentLang][key] ?? key;
  }
}

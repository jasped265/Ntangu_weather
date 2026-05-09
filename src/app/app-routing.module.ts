import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ShellComponent } from './shared/components/shell/shell.component';
import { LoginComponent } from './modules/auth/login/login.component';
import { RegisterComponent } from './modules/auth/register/register.component';
import { ForgotPasswordComponent } from './modules/auth/forgot-password/forgot-password.component';
import { DashboardComponent } from './modules/dashboard/dashboard.component';
import { MapComponent } from './modules/map/map.component';
import { FavoritesComponent } from './modules/weather/favorites/favorites.component';
import { CityDetailComponent } from './modules/weather/city-detail/city-detail.component';
import { BackofficeComponent } from './modules/backoffice/backoffice.component';
import { ReportsComponent } from './modules/reports/reports.component';
import { HistoryComponent } from './modules/reports/history.component';
import { SettingsComponent } from './modules/settings/settings.component';
import { AuthGuard, AdminGuard } from './core/guards/auth.guard';

const routes: Routes = [
  { path: '', redirectTo: '/auth/login', pathMatch: 'full' },
  { path: 'auth/login', component: LoginComponent },
  { path: 'auth/register', component: RegisterComponent },
  { path: 'auth/forgot-password', component: ForgotPasswordComponent },
  {
    path: '',
    component: ShellComponent,
    canActivate: [AuthGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'map', component: MapComponent },
      { path: 'favorites', component: FavoritesComponent },
      { path: 'weather/:city', component: CityDetailComponent },
      { path: 'history', component: HistoryComponent },
      { path: 'reports', component: ReportsComponent, canActivate: [AdminGuard] },
      { path: 'backoffice', component: BackofficeComponent, canActivate: [AdminGuard] },
      { path: 'settings', component: SettingsComponent },
    ]
  },
  { path: '**', redirectTo: '/dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'top' })],
  exports: [RouterModule]
})
export class AppRoutingModule {}

import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';

import { AppComponent } from './app.component';

// Auth
import { LoginComponent } from './modules/auth/login/login.component';
import { RegisterComponent } from './modules/auth/register/register.component';
import { ForgotPasswordComponent } from './modules/auth/forgot-password/forgot-password.component';

// Shell & Shared
import { ShellComponent } from './shared/components/shell/shell.component';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { TopbarComponent } from './shared/components/topbar/topbar.component';
import { BottomNavComponent } from './shared/components/bottom-nav/bottom-nav.component';

// Pages
import { DashboardComponent } from './modules/dashboard/dashboard.component';
import { MapComponent } from './modules/map/map.component';
import { FavoritesComponent } from './modules/weather/favorites/favorites.component';
import { CityDetailComponent } from './modules/weather/city-detail/city-detail.component';
import { BackofficeComponent } from './modules/backoffice/backoffice.component';
import { ReportsComponent } from './modules/reports/reports.component';
import { HistoryComponent } from './modules/reports/history.component';
import { SettingsComponent } from './modules/settings/settings.component';

// Pipes
import { UniquePipe } from './shared/pipes/unique.pipe';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RegisterComponent,
    ForgotPasswordComponent,
    ShellComponent,
    SidebarComponent,
    TopbarComponent,
    BottomNavComponent,
    DashboardComponent,
    MapComponent,
    FavoritesComponent,
    CityDetailComponent,
    BackofficeComponent,
    ReportsComponent,
    HistoryComponent,
    SettingsComponent,
    UniquePipe,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}

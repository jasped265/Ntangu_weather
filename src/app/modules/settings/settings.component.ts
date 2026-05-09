import { Component } from '@angular/core';
import { ThemeService, I18nService } from '../../shared/services/theme.service';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent {
  notifications = { email: true, push: true, alerts: true };
  units = 'celsius';

  constructor(public theme: ThemeService, public i18n: I18nService, public auth: AuthService) {}
}

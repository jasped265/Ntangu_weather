import { Component } from '@angular/core';
import { ThemeService, I18nService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss']
})
export class TopbarComponent {
  searchQuery = '';

  constructor(
    public theme: ThemeService,
    public i18n: I18nService,
    public auth: AuthService
  ) {}
}

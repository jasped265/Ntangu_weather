# Ntangu Weather — Angular Frontend

## Quick Start
```bash
npm install
ng serve        # http://localhost:4200
```

## Demo Credentials
- Admin: admin@ntangu.com / admin123
- User:  joao@example.com / user123

## Architecture
```
src/app/
├── core/guards/          AuthGuard, AdminGuard
├── modules/
│   ├── auth/             login, register, forgot-password
│   ├── dashboard/        main weather view
│   ├── map/              interactive SVG map + layers
│   ├── weather/          favorites, city-detail
│   ├── backoffice/       admin CRUD (users, cities)
│   ├── reports/          analytics, export history
│   └── settings/         theme, language, profile
└── shared/
    ├── components/       sidebar, topbar, bottom-nav, shell
    ├── services/         auth.service, weather.service, theme.service
    ├── models/           weather.model.ts
    └── pipes/            unique.pipe.ts
```

## Features
- Dark/Light mode (persisted)
- Portuguese/English i18n (persisted)
- Role-based routing (Admin / User)
- Full CRUD UI: users, cities
- Weather dashboard: current, hourly, daily, metrics
- Interactive animated SVG map with layer toggles
- Favorites city manager
- Reports with bar charts and export buttons (simulated)
- Settings: profile, notifications, units, plan upgrade
- Mobile responsive with bottom nav bar
- Auth flow: login, register, password recovery

## Backend Integration
Replace mock Observables in `weather.service.ts` and `auth.service.ts`
with `HttpClient` calls to your PHP API endpoints.

## Build
```bash
ng build --configuration production
# Output: dist/ntangu-weather/
```

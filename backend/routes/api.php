<?php

declare(strict_types=1);

use App\Controllers\AdminController;
use App\Controllers\AuthController;
use App\Controllers\CityController;
use App\Controllers\FavoriteController;
use App\Controllers\ReportController;
use App\Controllers\SettingsController;
use App\Controllers\WeatherController;
use App\Repositories\CityRepository;
use App\Repositories\FavoriteRepository;
use App\Repositories\ReportRepository;
use App\Repositories\SettingsRepository;
use App\Repositories\UserRepository;
use App\Repositories\WeatherCacheRepository;
use App\Services\AdminService;
use App\Services\AuthService;
use App\Services\FavoriteService;
use App\Services\ReportService;
use App\Services\SettingsService;
use App\Services\WeatherService;

$userRepo = new UserRepository($pdo);
$cityRepo = new CityRepository($pdo);
$favoriteRepo = new FavoriteRepository($pdo);
$settingsRepo = new SettingsRepository($pdo);
$weatherCacheRepo = new WeatherCacheRepository($pdo);
$reportRepo = new ReportRepository($pdo);

$authService = new AuthService($pdo, $userRepo, $tokenService, $appConfig);
$weatherService = new WeatherService($appConfig, $cityRepo, $weatherCacheRepo, $pdo);
$favoriteService = new FavoriteService($favoriteRepo);
$settingsService = new SettingsService($settingsRepo);
$adminService = new AdminService($userRepo, $cityRepo);
$reportService = new ReportService($reportRepo, $userRepo, $cityRepo);

$authController = new AuthController($authService, $userRepo);
$weatherController = new WeatherController($weatherService);
$cityController = new CityController($cityRepo);
$favoriteController = new FavoriteController($favoriteService);
$settingsController = new SettingsController($settingsService);
$adminController = new AdminController($adminService, $cityRepo, $pdo);
$reportController = new ReportController($reportService);

$auth = fn(\App\Core\Request $r) => $authMiddleware->handle($r);
$admin = fn(\App\Core\Request $r) => $roleMiddleware->handle($r, 'admin');

// Healthcheck simples.
$router->add('GET', '/api/v1/health', fn() => \App\Core\Response::json(true, 'API online', ['app' => $appConfig['app_name']]));

// Auth.
$router->add('POST', '/api/v1/auth/register', fn($r) => $authController->register($r));
$router->add('POST', '/api/v1/auth/login', fn($r) => $authController->login($r));
$router->add('POST', '/api/v1/auth/refresh', fn($r) => $authController->refresh($r));
$router->add('POST', '/api/v1/auth/forgot-password', fn($r) => $authController->forgotPassword($r));
$router->add('POST', '/api/v1/auth/reset-password', fn($r) => $authController->resetPassword($r));
$router->add('POST', '/api/v1/auth/logout', fn($r) => $authController->logout($r), [$auth]);
$router->add('GET', '/api/v1/auth/me', fn($r) => $authController->me($r), [$auth]);

// Weather.
$router->add('GET', '/api/v1/weather/current', fn($r) => $weatherController->current($r), [$auth]);
$router->add('GET', '/api/v1/weather/hourly', fn($r) => $weatherController->hourly($r), [$auth]);
$router->add('GET', '/api/v1/weather/daily', fn($r) => $weatherController->daily($r), [$auth]);
$router->add('GET', '/api/v1/weather/summary', fn($r) => $weatherController->summary($r), [$auth]);
$router->add('GET', '/api/v1/weather/alerts', fn($r) => $weatherController->alerts($r), [$auth]);

// Cities.
$router->add('GET', '/api/v1/cities', fn($r) => $cityController->index($r), [$auth]);
$router->add('POST', '/api/v1/cities', fn($r) => $cityController->create($r), [$auth, $admin]);
$router->add('PUT', '/api/v1/cities/{id}', fn($r) => $cityController->update($r), [$auth, $admin]);
$router->add('DELETE', '/api/v1/cities/{id}', fn($r) => $cityController->delete($r), [$auth, $admin]);

// Favorites.
$router->add('GET', '/api/v1/favorites', fn($r) => $favoriteController->index($r), [$auth]);
$router->add('POST', '/api/v1/favorites/{cityId}', fn($r) => $favoriteController->store($r), [$auth]);
$router->add('DELETE', '/api/v1/favorites/{cityId}', fn($r) => $favoriteController->destroy($r), [$auth]);

// Settings.
$router->add('GET', '/api/v1/settings/me', fn($r) => $settingsController->me($r), [$auth]);
$router->add('PUT', '/api/v1/settings/me', fn($r) => $settingsController->update($r), [$auth]);

// Admin.
$router->add('GET', '/api/v1/admin/users', fn() => $adminController->users(), [$auth, $admin]);
$router->add('POST', '/api/v1/admin/users', fn($r) => $adminController->createUser($r), [$auth, $admin]);
$router->add('PUT', '/api/v1/admin/users/{id}', fn($r) => $adminController->updateUser($r), [$auth, $admin]);
$router->add('DELETE', '/api/v1/admin/users/{id}', fn($r) => $adminController->deleteUser($r), [$auth, $admin]);

$router->add('GET', '/api/v1/admin/cities', fn() => $adminController->cities(), [$auth, $admin]);
$router->add('POST', '/api/v1/admin/cities', fn($r) => $adminController->createCity($r), [$auth, $admin]);
$router->add('PUT', '/api/v1/admin/cities/{id}', fn($r) => $adminController->updateCity($r), [$auth, $admin]);
$router->add('DELETE', '/api/v1/admin/cities/{id}', fn($r) => $adminController->deleteCity($r), [$auth, $admin]);
$router->add('GET', '/api/v1/admin/alerts', fn() => $adminController->alerts(), [$auth, $admin]);

// Reports.
$router->add('GET', '/api/v1/reports', fn() => $reportController->index(), [$auth, $admin]);
$router->add('POST', '/api/v1/reports/generate', fn($r) => $reportController->generate($r), [$auth, $admin]);
$router->add('GET', '/api/v1/reports/summary', fn() => $reportController->summary(), [$auth, $admin]);
$router->add('GET', '/api/v1/reports/export/csv', fn($r) => $reportController->exportCsv($r), [$auth, $admin]);

// Map.
$router->add('GET', '/api/v1/map/markers', fn() => $weatherController->markers(), [$auth]);

<?php

declare(strict_types=1);

return [
    // Configuracoes de aplicacao com leitura de ambiente e fallbacks seguros.
    'app_name' => $_ENV['APP_NAME'] ?? getenv('APP_NAME') ?: 'Ntangu Weather API',
    'app_env' => $_ENV['APP_ENV'] ?? getenv('APP_ENV') ?: 'development',
    'app_debug' => filter_var($_ENV['APP_DEBUG'] ?? getenv('APP_DEBUG') ?: 'true', FILTER_VALIDATE_BOOL),
    'base_url' => $_ENV['APP_URL'] ?? getenv('APP_URL') ?: 'http://localhost:8000',

    'cors_origin' => $_ENV['CORS_ORIGIN'] ?? getenv('CORS_ORIGIN') ?: 'http://localhost:4200',

    'jwt_secret' => $_ENV['JWT_SECRET'] ?? getenv('JWT_SECRET') ?: 'change-this-secret-in-production',
    'jwt_ttl_minutes' => (int) ($_ENV['JWT_TTL_MINUTES'] ?? getenv('JWT_TTL_MINUTES') ?: 30),
    'refresh_ttl_days' => (int) ($_ENV['REFRESH_TTL_DAYS'] ?? getenv('REFRESH_TTL_DAYS') ?: 7),

    'weather_api_key' => $_ENV['WEATHERAPI_KEY'] ?? getenv('WEATHERAPI_KEY') ?: '',
    'weather_api_base' => $_ENV['WEATHERAPI_BASE'] ?? getenv('WEATHERAPI_BASE') ?: 'https://api.weatherapi.com/v1',
    // Compatibilidade com plano gratuito da WeatherAPI (normalmente max 3 dias).
    'weather_forecast_days' => (int) ($_ENV['WEATHER_FORECAST_DAYS'] ?? getenv('WEATHER_FORECAST_DAYS') ?: 3),
];

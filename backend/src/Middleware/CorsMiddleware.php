<?php

declare(strict_types=1);

namespace App\Middleware;

final class CorsMiddleware
{
    public function handle(array $appConfig): void
    {
        header('Access-Control-Allow-Origin: ' . $appConfig['cors_origin']);
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        header('Access-Control-Allow-Credentials: true');

        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
            http_response_code(200);
            exit;
        }
    }
}

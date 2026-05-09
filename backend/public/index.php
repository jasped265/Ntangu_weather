<?php

declare(strict_types=1);

use App\Core\DB;
use App\Core\Logger;
use App\Core\Request;
use App\Core\Response;
use App\Core\Router;
use App\Middleware\AuthMiddleware;
use App\Middleware\CorsMiddleware;
use App\Middleware\RoleMiddleware;
use App\Services\TokenService;

spl_autoload_register(function (string $class): void {
    $prefix = 'App\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }
    $relative = substr($class, strlen($prefix));
    $path = dirname(__DIR__) . '/src/' . str_replace('\\', '/', $relative) . '.php';
    if (file_exists($path)) {
        require_once $path;
    }
});

$appConfig = require dirname(__DIR__) . '/config/app.php';
$dbConfig = require dirname(__DIR__) . '/config/db.php';

try {
    $pdo = DB::getConnection($dbConfig);
    $router = new Router();

    (new CorsMiddleware())->handle($appConfig);

    $tokenService = new TokenService($appConfig);
    $authMiddleware = new AuthMiddleware($tokenService);
    $roleMiddleware = new RoleMiddleware();

    require dirname(__DIR__) . '/routes/api.php';

    $request = Request::capture();
    $router->dispatch($request);
} catch (Throwable $e) {
    Logger::error('Erro fatal da API', ['exception' => $e->getMessage()]);
    Response::json(false, 'Erro interno do servidor', null, 500);
}

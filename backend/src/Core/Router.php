<?php

declare(strict_types=1);

namespace App\Core;

final class Router
{
    /** @var array<int, array{method:string,path:string,handler:callable,middlewares:array}> */
    private array $routes = [];

    public function add(string $method, string $path, callable $handler, array $middlewares = []): void
    {
        $this->routes[] = [
            'method' => strtoupper($method),
            'path' => '/' . trim($path, '/'),
            'handler' => $handler,
            'middlewares' => $middlewares,
        ];
    }

    public function dispatch(Request $request): void
    {
        foreach ($this->routes as $route) {
            if ($route['method'] !== $request->method) {
                continue;
            }

            $params = $this->match($route['path'], $request->path);
            if ($params === null) {
                continue;
            }

            $request->params = $params;
            foreach ($route['middlewares'] as $middleware) {
                $middleware($request);
            }

            $result = ($route['handler'])($request);
            if ($result !== null) {
                echo $result;
            }
            return;
        }

        Response::json(false, 'Recurso não encontrado', null, 404);
    }

    private function match(string $routePath, string $requestPath): ?array
    {
        $routeParts = explode('/', trim($routePath, '/'));
        $requestParts = explode('/', trim($requestPath, '/'));

        if (count($routeParts) !== count($requestParts)) {
            return null;
        }

        $params = [];
        foreach ($routeParts as $i => $part) {
            if (preg_match('/^\{(.+)\}$/', $part, $matches)) {
                $params[$matches[1]] = $requestParts[$i];
                continue;
            }

            if ($part !== $requestParts[$i]) {
                return null;
            }
        }

        return $params;
    }
}

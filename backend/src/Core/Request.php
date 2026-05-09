<?php

declare(strict_types=1);

namespace App\Core;

final class Request
{
    public string $method;
    public string $path;
    public array $query = [];
    public array $body = [];
    public array $headers = [];
    public array $params = [];
    public ?array $user = null;

    public static function capture(): self
    {
        $request = new self();
        $request->method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        $uri = $_SERVER['REQUEST_URI'] ?? '/';
        $request->path = '/' . trim((string) parse_url($uri, PHP_URL_PATH), '/');
        if ($request->path === '//') {
            $request->path = '/';
        }

        $request->query = $_GET ?? [];
        $request->headers = function_exists('getallheaders') ? (getallheaders() ?: []) : [];
        $request->body = self::parseBody($request->method);

        return $request;
    }

    public function input(string $key, mixed $default = null): mixed
    {
        return $this->body[$key] ?? $default;
    }

    public function query(string $key, mixed $default = null): mixed
    {
        return $this->query[$key] ?? $default;
    }

    public function header(string $key, mixed $default = null): mixed
    {
        foreach ($this->headers as $headerKey => $value) {
            if (strtolower($headerKey) === strtolower($key)) {
                return $value;
            }
        }

        return $default;
    }

    private static function parseBody(string $method): array
    {
        if ($method === 'GET' || $method === 'DELETE') {
            return [];
        }

        $raw = file_get_contents('php://input') ?: '';
        if ($raw === '') {
            return [];
        }

        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : [];
    }
}

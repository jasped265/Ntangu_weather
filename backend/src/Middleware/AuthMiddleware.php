<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Core\Request;
use App\Core\Response;
use App\Services\TokenService;

final class AuthMiddleware
{
    public function __construct(private readonly TokenService $tokenService)
    {
    }

    public function handle(Request $request): void
    {
        $authorization = (string) $request->header('Authorization', '');
        if (!str_starts_with($authorization, 'Bearer ')) {
            Response::json(false, 'Token ausente', null, 401);
            exit;
        }

        $jwt = trim(substr($authorization, 7));
        $payload = $this->tokenService->validateAccessToken($jwt);
        if ($payload === null) {
            Response::json(false, 'Token inválido ou expirado', null, 401);
            exit;
        }

        $request->user = [
            'id' => (int) $payload['sub'],
            'role' => (string) $payload['role'],
        ];
    }
}

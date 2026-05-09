<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Core\Request;
use App\Core\Response;

final class RoleMiddleware
{
    public function handle(Request $request, string $requiredRole): void
    {
        if (($request->user['role'] ?? '') !== $requiredRole) {
            Response::json(false, 'Sem permissão para este recurso', null, 403);
            exit;
        }
    }
}

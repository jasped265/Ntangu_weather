<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Services\FavoriteService;

final class FavoriteController
{
    public function __construct(private readonly FavoriteService $favoriteService)
    {
    }

    public function index(Request $request): void
    {
        $data = $this->favoriteService->listByUser((int)$request->user['id']);
        Response::json(true, 'Favoritos carregados', $data);
    }

    public function store(Request $request): void
    {
        $this->favoriteService->add((int)$request->user['id'], (int)$request->params['cityId']);
        Response::json(true, 'Favorito adicionado', null, 201);
    }

    public function destroy(Request $request): void
    {
        $this->favoriteService->remove((int)$request->user['id'], (int)$request->params['cityId']);
        Response::json(true, 'Favorito removido', null);
    }
}

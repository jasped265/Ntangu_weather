<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Services\LocationService;

final class LocationController
{
    public function __construct(private readonly LocationService $locationService)
    {
    }

    public function search(Request $request): void
    {
        $q = (string)$request->query('q', '');
        $limit = (int)$request->query('limit', 8);

        try {
            $data = $this->locationService->search($q, $limit);
            Response::json(true, 'Localizações carregadas', $data);
        } catch (\Throwable $e) {
            Response::json(false, 'Falha ao pesquisar localizações', null, 503, ['location' => [$e->getMessage()]]);
        }
    }
}


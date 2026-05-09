<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Repositories\CityRepository;

final class CityController
{
    public function __construct(private readonly CityRepository $cityRepository)
    {
    }

    public function index(Request $request): void
    {
        $search = $request->query('search');
        $data = $this->cityRepository->listActive($search ? (string)$search : null);
        Response::json(true, 'Cidades carregadas', $data);
    }

    public function create(Request $request): void
    {
        $payload = [
            'name' => (string)$request->input('name'),
            'country' => (string)$request->input('country'),
            'lat' => (float)$request->input('lat'),
            'lon' => (float)$request->input('lon'),
            'is_active' => (int)$request->input('is_active', 1),
        ];
        if ($payload['name'] === '' || $payload['country'] === '') {
            Response::json(false, 'Validation failed', null, 422);
            return;
        }
        $id = $this->cityRepository->create($payload);
        Response::json(true, 'Cidade criada', $this->cityRepository->findById($id), 201);
    }

    public function update(Request $request): void
    {
        $id = (int)$request->params['id'];
        $payload = [
            'name' => (string)$request->input('name'),
            'country' => (string)$request->input('country'),
            'lat' => (float)$request->input('lat'),
            'lon' => (float)$request->input('lon'),
            'is_active' => (int)$request->input('is_active', 1),
        ];
        $this->cityRepository->update($id, $payload);
        Response::json(true, 'Cidade actualizada', $this->cityRepository->findById($id));
    }

    public function delete(Request $request): void
    {
        $id = (int)$request->params['id'];
        $this->cityRepository->delete($id);
        Response::json(true, 'Cidade removida', null);
    }
}

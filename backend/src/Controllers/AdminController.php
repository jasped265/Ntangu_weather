<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Repositories\CityRepository;
use App\Services\AdminService;
use PDO;

final class AdminController
{
    public function __construct(
        private readonly AdminService $adminService,
        private readonly CityRepository $cityRepository,
        private readonly PDO $pdo
    ) {
    }

    public function users(): void
    {
        Response::json(true, 'Utilizadores carregados', $this->adminService->listUsers());
    }

    public function createUser(Request $request): void
    {
        $payload = [
            'name' => (string)$request->input('name'),
            'email' => (string)$request->input('email'),
            'password' => (string)$request->input('password', 'User123!'),
            'role' => (string)$request->input('role', 'user'),
        ];
        $id = $this->adminService->createUser($payload);
        Response::json(true, 'Utilizador criado', ['id' => $id], 201);
    }

    public function updateUser(Request $request): void
    {
        $id = (int)$request->params['id'];
        $this->adminService->updateUser($id, $request->body);
        Response::json(true, 'Utilizador actualizado', null);
    }

    public function deleteUser(Request $request): void
    {
        $id = (int)$request->params['id'];
        $this->adminService->deleteUser($id);
        Response::json(true, 'Utilizador removido', null);
    }

    public function cities(): void
    {
        Response::json(true, 'Cidades carregadas', $this->adminService->listCities(true));
    }

    public function alerts(): void
    {
        $stmt = $this->pdo->query('SELECT wa.*, c.name AS city_name FROM weather_alerts wa INNER JOIN cities c ON c.id = wa.city_id ORDER BY wa.id DESC LIMIT 100');
        Response::json(true, 'Alertas recentes', $stmt->fetchAll());
    }

    public function createCity(Request $request): void
    {
        $id = $this->cityRepository->create([
            'name' => (string)$request->input('name'),
            'country' => (string)$request->input('country'),
            'lat' => (float)$request->input('lat'),
            'lon' => (float)$request->input('lon'),
            'is_active' => (int)$request->input('is_active', 1),
        ]);
        Response::json(true, 'Cidade criada', $this->cityRepository->findById($id), 201);
    }

    public function updateCity(Request $request): void
    {
        $id = (int)$request->params['id'];
        $this->cityRepository->update($id, [
            'name' => (string)$request->input('name'),
            'country' => (string)$request->input('country'),
            'lat' => (float)$request->input('lat'),
            'lon' => (float)$request->input('lon'),
            'is_active' => (int)$request->input('is_active', 1),
        ]);
        Response::json(true, 'Cidade actualizada', $this->cityRepository->findById($id));
    }

    public function deleteCity(Request $request): void
    {
        $this->cityRepository->delete((int)$request->params['id']);
        Response::json(true, 'Cidade removida', null);
    }
}

<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\CityRepository;
use App\Repositories\UserRepository;

final class AdminService
{
    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly CityRepository $cityRepository
    ) {
    }

    public function listUsers(): array
    {
        return $this->userRepository->listAll();
    }

    public function createUser(array $payload): int
    {
        $hash = password_hash($payload['password'], PASSWORD_ARGON2ID);
        return $this->userRepository->create($payload['name'], $payload['email'], $hash, $payload['role'] ?? 'user');
    }

    public function updateUser(int $id, array $payload): bool
    {
        return $this->userRepository->update($id, $payload);
    }

    public function deleteUser(int $id): bool
    {
        return $this->userRepository->delete($id);
    }

    public function listCities(bool $includeInactive = true): array
    {
        return $includeInactive ? $this->cityRepository->listAll() : $this->cityRepository->listActive();
    }
}

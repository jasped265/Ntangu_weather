<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\FavoriteRepository;

final class FavoriteService
{
    public function __construct(private readonly FavoriteRepository $favoriteRepository)
    {
    }

    public function listByUser(int $userId): array
    {
        return $this->favoriteRepository->listByUser($userId);
    }

    public function add(int $userId, int $cityId): void
    {
        $this->favoriteRepository->add($userId, $cityId);
    }

    public function remove(int $userId, int $cityId): void
    {
        $this->favoriteRepository->remove($userId, $cityId);
    }
}

<?php

declare(strict_types=1);

namespace App\Repositories;

use PDO;

final class FavoriteRepository
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    public function listByUser(int $userId): array
    {
        $sql = 'SELECT c.* FROM favorites f INNER JOIN cities c ON c.id = f.city_id WHERE f.user_id = :user_id ORDER BY c.name';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':user_id' => $userId]);
        return $stmt->fetchAll();
    }

    public function add(int $userId, int $cityId): bool
    {
        $stmt = $this->pdo->prepare('INSERT IGNORE INTO favorites (user_id, city_id) VALUES (:user_id, :city_id)');
        return $stmt->execute([':user_id' => $userId, ':city_id' => $cityId]);
    }

    public function remove(int $userId, int $cityId): bool
    {
        $stmt = $this->pdo->prepare('DELETE FROM favorites WHERE user_id = :user_id AND city_id = :city_id');
        return $stmt->execute([':user_id' => $userId, ':city_id' => $cityId]);
    }
}

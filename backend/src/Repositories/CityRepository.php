<?php

declare(strict_types=1);

namespace App\Repositories;

use PDO;

final class CityRepository
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    public function listActive(?string $search = null): array
    {
        if ($search) {
            $stmt = $this->pdo->prepare('SELECT * FROM cities WHERE is_active = 1 AND name LIKE :search ORDER BY name');
            $stmt->execute([':search' => '%' . $search . '%']);
            return $stmt->fetchAll();
        }

        $stmt = $this->pdo->query('SELECT * FROM cities WHERE is_active = 1 ORDER BY name');
        return $stmt->fetchAll();
    }

    public function listAll(): array
    {
        $stmt = $this->pdo->query('SELECT * FROM cities ORDER BY name');
        return $stmt->fetchAll();
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM cities WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function findByName(string $name): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM cities WHERE name = :name LIMIT 1');
        $stmt->execute([':name' => $name]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function create(array $payload): int
    {
        $stmt = $this->pdo->prepare('INSERT INTO cities (name, country, lat, lon, is_active) VALUES (:name, :country, :lat, :lon, :is_active)');
        $stmt->execute([
            ':name' => $payload['name'],
            ':country' => $payload['country'],
            ':lat' => $payload['lat'],
            ':lon' => $payload['lon'],
            ':is_active' => (int)($payload['is_active'] ?? 1),
        ]);
        return (int) $this->pdo->lastInsertId();
    }

    public function update(int $id, array $payload): bool
    {
        $stmt = $this->pdo->prepare('UPDATE cities SET name = :name, country = :country, lat = :lat, lon = :lon, is_active = :is_active WHERE id = :id');
        return $stmt->execute([
            ':id' => $id,
            ':name' => $payload['name'],
            ':country' => $payload['country'],
            ':lat' => $payload['lat'],
            ':lon' => $payload['lon'],
            ':is_active' => (int)($payload['is_active'] ?? 1),
        ]);
    }

    public function updateGeo(int $id, string $country, float $lat, float $lon): bool
    {
        $stmt = $this->pdo->prepare('UPDATE cities SET country = :country, lat = :lat, lon = :lon WHERE id = :id');
        return $stmt->execute([
            ':id' => $id,
            ':country' => $country,
            ':lat' => $lat,
            ':lon' => $lon,
        ]);
    }

    public function delete(int $id): bool
    {
        $stmt = $this->pdo->prepare('DELETE FROM cities WHERE id = :id');
        return $stmt->execute([':id' => $id]);
    }
}

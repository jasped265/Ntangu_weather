<?php

declare(strict_types=1);

namespace App\Repositories;

use PDO;

final class WeatherCacheRepository
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    public function getValid(int $cityId, string $type): ?array
    {
        $sql = 'SELECT * FROM weather_cache
                WHERE city_id = :city_id AND data_type = :data_type AND expires_at > NOW()
                ORDER BY id DESC LIMIT 1';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':city_id' => $cityId, ':data_type' => $type]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function put(int $cityId, string $type, array $payload, string $source, string $expiresAt): bool
    {
        $sql = 'INSERT INTO weather_cache (city_id, data_type, payload_json, source, expires_at)
                VALUES (:city_id, :data_type, :payload_json, :source, :expires_at)';
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute([
            ':city_id' => $cityId,
            ':data_type' => $type,
            ':payload_json' => json_encode($payload, JSON_UNESCAPED_UNICODE),
            ':source' => $source,
            ':expires_at' => $expiresAt,
        ]);
    }
}

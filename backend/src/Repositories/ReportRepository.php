<?php

declare(strict_types=1);

namespace App\Repositories;

use PDO;

final class ReportRepository
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    public function listAll(): array
    {
        $stmt = $this->pdo->query('SELECT * FROM reports ORDER BY id DESC');
        return $stmt->fetchAll();
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM reports WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        return $row ?: null;
    }
 
    

    public function create(string $name, string $type, array $filters, int $createdBy): int
    {
        $stmt = $this->pdo->prepare('INSERT INTO reports (name, type, filters_json, created_by) VALUES (:name, :type, :filters_json, :created_by)');
        $stmt->execute([
            ':name' => $name,
            ':type' => $type,
            ':filters_json' => json_encode($filters, JSON_UNESCAPED_UNICODE),
            ':created_by' => $createdBy,
        ]);
        return (int) $this->pdo->lastInsertId();
    }
}

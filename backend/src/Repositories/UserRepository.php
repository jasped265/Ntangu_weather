<?php

declare(strict_types=1);

namespace App\Repositories;

use PDO;

final class UserRepository
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    public function create(string $name, string $email, string $passwordHash, string $role = 'user'): int
    {
        $stmt = $this->pdo->prepare('INSERT INTO users (name, email, password_hash, role) VALUES (:name, :email, :password_hash, :role)');
        $stmt->execute([
            ':name' => $name,
            ':email' => $email,
            ':password_hash' => $passwordHash,
            ':role' => $role,
        ]);
        return (int) $this->pdo->lastInsertId();
    }

    public function findByEmail(string $email): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM users WHERE email = :email LIMIT 1');
        $stmt->execute([':email' => $email]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT id, name, email, role, status, created_at, updated_at FROM users WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function listAll(): array
    {
        $stmt = $this->pdo->query('SELECT id, name, email, role, status, created_at, updated_at FROM users ORDER BY id DESC');
        return $stmt->fetchAll();
    }

    public function update(int $id, array $payload): bool
    {
        $fields = [];
        $params = [':id' => $id];
        foreach (['name', 'email', 'role', 'status'] as $field) {
            if (array_key_exists($field, $payload)) {
                $fields[] = "{$field} = :{$field}";
                $params[":{$field}"] = $payload[$field];
            }
        }
        if (empty($fields)) {
            return true;
        }
        $sql = 'UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = :id';
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute($params);
    }

    public function delete(int $id): bool
    {
        $stmt = $this->pdo->prepare('DELETE FROM users WHERE id = :id');
        return $stmt->execute([':id' => $id]);
    }

    public function updatePasswordByEmail(string $email, string $passwordHash): bool
    {
        $stmt = $this->pdo->prepare('UPDATE users SET password_hash = :password_hash WHERE email = :email');
        return $stmt->execute([':password_hash' => $passwordHash, ':email' => $email]);
    }
}

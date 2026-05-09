<?php

declare(strict_types=1);

namespace App\Repositories;

use PDO;

final class SettingsRepository
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    public function getByUser(int $userId): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM user_settings WHERE user_id = :user_id LIMIT 1');
        $stmt->execute([':user_id' => $userId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function upsert(int $userId, array $payload): bool
    {
        $sql = 'INSERT INTO user_settings (user_id, theme, language, temperature_unit, notify_email, notify_push, notify_alerts)
                VALUES (:user_id, :theme, :language, :temperature_unit, :notify_email, :notify_push, :notify_alerts)
                ON DUPLICATE KEY UPDATE
                  theme = VALUES(theme),
                  language = VALUES(language),
                  temperature_unit = VALUES(temperature_unit),
                  notify_email = VALUES(notify_email),
                  notify_push = VALUES(notify_push),
                  notify_alerts = VALUES(notify_alerts)';

        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute([
            ':user_id' => $userId,
            ':theme' => $payload['theme'] ?? 'dark',
            ':language' => $payload['language'] ?? 'pt',
            ':temperature_unit' => $payload['temperature_unit'] ?? 'celsius',
            ':notify_email' => (int)($payload['notify_email'] ?? 1),
            ':notify_push' => (int)($payload['notify_push'] ?? 1),
            ':notify_alerts' => (int)($payload['notify_alerts'] ?? 1),
        ]);
    }
}

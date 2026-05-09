<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\SettingsRepository;

final class SettingsService
{
    public function __construct(private readonly SettingsRepository $settingsRepository)
    {
    }

    public function get(int $userId): array
    {
        $settings = $this->settingsRepository->getByUser($userId);
        if ($settings) {
            return $settings;
        }

        $defaults = [
            'theme' => 'dark',
            'language' => 'pt',
            'temperature_unit' => 'celsius',
            'notify_email' => 1,
            'notify_push' => 1,
            'notify_alerts' => 1,
        ];

        $this->settingsRepository->upsert($userId, $defaults);
        return $this->settingsRepository->getByUser($userId) ?? $defaults;
    }

    public function update(int $userId, array $payload): void
    {
        $this->settingsRepository->upsert($userId, $payload);
    }
}

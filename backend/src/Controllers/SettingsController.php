<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Services\SettingsService;

final class SettingsController
{
    public function __construct(private readonly SettingsService $settingsService)
    {
    }

    public function me(Request $request): void
    {
        $settings = $this->settingsService->get((int)$request->user['id']);
        Response::json(true, 'Configurações carregadas', $settings);
    }

    public function update(Request $request): void
    {
        $payload = [
            'theme' => (string)$request->input('theme', 'dark'),
            'language' => (string)$request->input('language', 'pt'),
            'temperature_unit' => (string)$request->input('temperature_unit', 'celsius'),
            'notify_email' => (int)$request->input('notify_email', 1),
            'notify_push' => (int)$request->input('notify_push', 1),
            'notify_alerts' => (int)$request->input('notify_alerts', 1),
        ];
        $this->settingsService->update((int)$request->user['id'], $payload);
        Response::json(true, 'Configurações actualizadas', $this->settingsService->get((int)$request->user['id']));
    }
}

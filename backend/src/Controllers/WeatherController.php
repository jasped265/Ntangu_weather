<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Services\WeatherService;

final class WeatherController
{
    public function __construct(private readonly WeatherService $weatherService)
    {
    }

    public function current(Request $request): void
    {
        $city = (string)$request->query('city', 'Luanda');
        try {
            Response::json(true, 'Clima actual carregado', $this->weatherService->current($city));
        } catch (\Throwable $e) {
            Response::json(false, 'Falha ao obter clima actual', null, 503, ['weather' => [$e->getMessage()]]);
        }
    }

    public function hourly(Request $request): void
    {
        $city = (string)$request->query('city', 'Luanda');
        try {
            Response::json(true, 'Previsão horária carregada', $this->weatherService->hourly($city));
        } catch (\Throwable $e) {
            Response::json(false, 'Falha ao obter previsão horária', null, 503, ['weather' => [$e->getMessage()]]);
        }
    }

    public function daily(Request $request): void
    {
        $city = (string)$request->query('city', 'Luanda');
        try {
            Response::json(true, 'Previsão diária carregada', $this->weatherService->daily($city));
        } catch (\Throwable $e) {
            Response::json(false, 'Falha ao obter previsão diária', null, 503, ['weather' => [$e->getMessage()]]);
        }
    }

    public function summary(Request $request): void
    {
        $city = (string)$request->query('city', 'Luanda');
        try {
            Response::json(true, 'Resumo meteorológico carregado', $this->weatherService->summary($city));
        } catch (\Throwable $e) {
            Response::json(false, 'Falha ao obter resumo', null, 503, ['weather' => [$e->getMessage()]]);
        }
    }

    public function alerts(Request $request): void
    {
        $city = (string)$request->query('city', 'Luanda');
        try {
            Response::json(true, 'Alertas carregados', $this->weatherService->alerts($city));
        } catch (\Throwable $e) {
            Response::json(false, 'Falha ao obter alertas', null, 503, ['weather' => [$e->getMessage()]]);
        }
    }

    public function markers(): void
    {
        try {
            Response::json(true, 'Marcadores do mapa carregados', $this->weatherService->markers());
        } catch (\Throwable $e) {
            Response::json(false, 'Falha ao obter marcadores', null, 503, ['weather' => [$e->getMessage()]]);
        }
    }
}

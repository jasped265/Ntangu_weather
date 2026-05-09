<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Services\ReportService;

final class ReportController
{
    public function __construct(private readonly ReportService $reportService)
    {
    }

    public function index(): void
    {
        Response::json(true, 'Relatórios carregados', $this->reportService->list());
    }

    public function generate(Request $request): void
    {
        $name = (string)$request->input('name', 'Relatório Ntangu');
        $type = (string)$request->input('type', 'weather_summary');
        $filters = (array)$request->input('filters', []);
        $id = $this->reportService->generate($name, $type, $filters, (int)$request->user['id']);
        Response::json(true, 'Relatório gerado', ['id' => $id], 201);
    }

    public function summary(): void
    {
        Response::json(true, 'Resumo de métricas carregado', $this->reportService->summary());
    }

    public function exportCsv(Request $request): void
    {
        $type = (string)$request->query('type', 'cities');
        $csv = $this->reportService->exportCsv($type);
        Response::csv($csv['filename'], $csv['content']);
    }
}

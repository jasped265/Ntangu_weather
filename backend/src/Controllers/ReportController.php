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

    // Export CSV global (todas as cidades)
    public function exportCsv(Request $request): void
    {
        $type = (string)$request->query('type', 'cities');
        $csv = $this->reportService->exportCsv($type);
        Response::csv($csv['filename'], $csv['content']);
    }

    // Export CSV de um relatório individual
    public function exportReportCsv(Request $request): void
    {
        $id = (int)($request->params['id'] ?? 0);
        $report = $this->reportService->findById($id);

        if (!$report) {
            Response::json(false, 'Relatório não encontrado', null, 404);
            return;
        }

        $csv = $this->reportService->exportReportCsv($report);
        Response::csv($csv['filename'], $csv['content']);
    }

    // Export PDF de um relatório individual
    public function exportReportPdf(Request $request): void
    {
        $id = (int)($request->params['id'] ?? 0);
        $report = $this->reportService->findById($id);

        if (!$report) {
            Response::json(false, 'Relatório não encontrado', null, 404);
            return;
        }

        $pdf = $this->reportService->exportReportPdf($report);
        Response::pdf($pdf['filename'], $pdf['content'], $pdf['binary'] ?? true);
    }
}
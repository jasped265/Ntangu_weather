<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\CityRepository;
use App\Repositories\ReportRepository;
use App\Repositories\UserRepository;

final class ReportService
{
    public function __construct(
        private readonly ReportRepository $reportRepository,
        private readonly UserRepository $userRepository,
        private readonly CityRepository $cityRepository
    ) {
    }

    public function list(): array
    {
        return $this->reportRepository->listAll();
    }

    public function generate(string $name, string $type, array $filters, int $userId): int
    {
        return $this->reportRepository->create($name, $type, $filters, $userId);
    }

    public function summary(): array
    {
        return [
            'total_users'  => count($this->userRepository->listAll()),
            'total_cities' => count($this->cityRepository->listAll()),
            'generated_at' => gmdate('c'),
        ];
    }

    // Busca um relatório pelo ID
    public function findById(int $id): ?array
    {
        return $this->reportRepository->findById($id);
    }

    // Export CSV global (todas as cidades ou utilizadores)
    public function exportCsv(string $type): array
    {
        $rows = match ($type) {
            'users'  => $this->userRepository->listAll(),
            'cities' => $this->cityRepository->listAll(),
            default  => $this->cityRepository->listAll(),
        };

        return [
            'filename' => 'report_' . $type . '_' . date('Ymd_His') . '.csv',
            'content'  => $this->buildCsv($rows),
        ];
    }

    // Export CSV de um relatório individual
    public function exportReportCsv(array $report): array
    {
        $type = $report['type'] ?? 'cities';

        // Mapeia o tipo do relatório para a origem de dados
        $rows = match (true) {
            str_contains($type, 'user')  => $this->userRepository->listAll(),
            default                      => $this->cityRepository->listAll(),
        };

        $safeName = preg_replace('/[^a-zA-Z0-9_\-]/', '', str_replace(' ', '_', $report['name'] ?? 'relatorio'));

        return [
            'filename' => $safeName . '_' . date('Ymd_His') . '.csv',
            'content'  => $this->buildCsv($rows),
        ];
    }

    // Export PDF real usando Dompdf
    public function exportReportPdf(array $report): array
    {
        // Garante que o autoloader do Composer está carregado
        // (necessário se o teu bootstrap não o inclui globalmente)
        $autoload = dirname(__DIR__, 3) . '/vendor/autoload.php';
        if (file_exists($autoload) && !class_exists(\Dompdf\Dompdf::class)) {
            require_once $autoload;
        }

        $type = $report['type'] ?? 'cities';
        $rows = match (true) {
            str_contains($type, 'user') => $this->userRepository->listAll(),
            default                     => $this->cityRepository->listAll(),
        };

        $safeName  = preg_replace('/[^a-zA-Z0-9_\-]/', '', str_replace(' ', '_', $report['name'] ?? 'relatorio'));
        $title     = htmlspecialchars($report['name'] ?? 'Relatório');
        $createdAt = htmlspecialchars($report['created_at'] ?? date('Y-m-d H:i:s'));
        $typeLabel = htmlspecialchars(strtoupper($type));

        // Monta tabela HTML — sem nth-child (não suportado pelo Dompdf)
        $tableHtml = '';
        if (!empty($rows)) {
            $headers    = array_keys($rows[0]);
            $tableHtml .= '<thead><tr>' . implode('', array_map(fn($h) => '<th>' . htmlspecialchars($h) . '</th>', $headers)) . '</tr></thead>';
            $tableHtml .= '<tbody>';
            foreach ($rows as $i => $row) {
                $bg = ($i % 2 === 0) ? '' : ' style="background-color:#f9fafb"';
                $tableHtml .= "<tr{$bg}>" . implode('', array_map(fn($v) => '<td>' . htmlspecialchars((string)$v) . '</td>', $row)) . '</tr>';
            }
            $tableHtml .= '</tbody>';
        } else {
            $tableHtml = '<tbody><tr><td colspan="10">Sem dados disponíveis</td></tr></tbody>';
        }

        $html = <<<HTML
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: DejaVu Sans, Arial, sans-serif; font-size: 11px; color: #1a1a2e; padding: 32px; }
    .header { border-bottom: 3px solid #4f46e5; padding-bottom: 12px; margin-bottom: 20px; }
    .header h1 { font-size: 18px; color: #1a1a2e; }
    .meta { font-size: 10px; color: #666; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { background-color: #4f46e5; color: #ffffff; padding: 8px 10px; text-align: left; font-weight: bold; }
    td { padding: 6px 10px; border-bottom: 1px solid #e5e7eb; }
    .footer { margin-top: 20px; font-size: 9px; color: #999; text-align: right; }
  </style>
</head>
<body>
  <div class="header">
    <h1>{$title}</h1>
    <p class="meta">Tipo: {$typeLabel} &nbsp;&nbsp; Gerado em: {$createdAt}</p>
  </div>
  <table>{$tableHtml}</table>
  <div class="footer">Ntangu Weather Platform &mdash; {$createdAt}</div>
</body>
</html>
HTML;

        try {
            $options = new \Dompdf\Options();
            $options->set('isHtml5ParserEnabled', true);
            $options->set('isRemoteEnabled', false);
            $options->set('defaultFont', 'DejaVu Sans');

            $dompdf = new \Dompdf\Dompdf($options);
            $dompdf->loadHtml($html, 'UTF-8');
            $dompdf->setPaper('A4', 'landscape');
            $dompdf->render();

            return [
                'filename' => $safeName . '_' . date('Ymd_His') . '.pdf',
                'content'  => $dompdf->output(),
                'binary'   => true,
            ];
        } catch (\Throwable $e) {
            // Fallback: devolve o HTML para o Response tratar
            error_log('[ReportService::exportReportPdf] Dompdf error: ' . $e->getMessage());
            return [
                'filename' => $safeName . '_' . date('Ymd_His') . '.pdf',
                'content'  => $html,
                'binary'   => false,
            ];
        }
    }

    // ── Helper privado ────────────────────────────────────────────────────────

    private function buildCsv(array $rows): string
    {
        $handle = fopen('php://temp', 'r+');
        if (empty($rows)) {
            fputcsv($handle, ['message']);
            fputcsv($handle, ['Sem dados']);
        } else {
            fputcsv($handle, array_keys($rows[0]));
            foreach ($rows as $row) {
                fputcsv($handle, $row);
            }
        }
        rewind($handle);
        $csv = stream_get_contents($handle) ?: '';
        fclose($handle);

        return $csv;
    }
}
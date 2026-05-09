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
            'total_users' => count($this->userRepository->listAll()),
            'total_cities' => count($this->cityRepository->listAll()),
            'generated_at' => gmdate('c'),
        ];
    }

    public function exportCsv(string $type): array
    {
        $rows = match ($type) {
            'users' => $this->userRepository->listAll(),
            'cities' => $this->cityRepository->listAll(),
            default => $this->cityRepository->listAll(),
        };

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

        return [
            'filename' => 'report_' . $type . '_' . date('Ymd_His') . '.csv',
            'content' => $csv,
        ];
    }
}

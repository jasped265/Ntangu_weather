<?php

declare(strict_types=1);

namespace App\Services;

final class LocationService
{
    public function __construct(private readonly array $appConfig)
    {
    }

    public function search(string $query, int $limit = 8): array
    {
        $query = trim($query);
        if ($query === '') {
            return [];
        }

        $url = $this->appConfig['weather_api_base']
            . '/search.json?key=' . urlencode((string)$this->appConfig['weather_api_key'])
            . '&q=' . urlencode($query);

        $json = $this->requestApi($url);
        $items = is_array($json) ? $json : [];

        $normalized = array_map(static fn($x) => [
            'name' => (string)($x['name'] ?? ''),
            'region' => (string)($x['region'] ?? ''),
            'country' => (string)($x['country'] ?? ''),
            'lat' => isset($x['lat']) ? (float)$x['lat'] : null,
            'lon' => isset($x['lon']) ? (float)$x['lon'] : null,
        ], $items);

        $normalized = array_values(array_filter($normalized, static fn($x) => $x['name'] !== '' && $x['lat'] !== null && $x['lon'] !== null));

        return array_slice($normalized, 0, max(1, $limit));
    }

    private function requestApi(string $url): array
    {
        if (empty($this->appConfig['weather_api_key'])) {
            throw new \RuntimeException('WEATHERAPI_KEY não configurada');
        }

        $context = stream_context_create(['http' => ['timeout' => 12]]);
        $response = @file_get_contents($url, false, $context);
        if ($response === false) {
            throw new \RuntimeException('Falha ao consultar WeatherAPI');
        }

        $json = json_decode($response, true);
        if (!is_array($json) || isset($json['error'])) {
            throw new \RuntimeException('Erro retornado pela WeatherAPI');
        }

        return $json;
    }
}


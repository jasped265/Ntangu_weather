<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\CityRepository;
use App\Repositories\WeatherCacheRepository;
use PDO;

final class WeatherService
{
    public function __construct(
        private readonly array $appConfig,
        private readonly CityRepository $cityRepository,
        private readonly WeatherCacheRepository $cacheRepository,
        private readonly PDO $pdo
    ) {
    }

    public function current(string $cityName): array
    {
        return $this->resolveWeather($cityName, 'current', 10, function (array $json): array {
            $current = $json['current'] ?? [];
            $location = $json['location'] ?? [];
            return [
                'city' => $location['name'] ?? '',
                'country' => $location['country'] ?? '',
                'temp' => $current['temp_c'] ?? null,
                'feels_like' => $current['feelslike_c'] ?? null,
                'condition' => $current['condition']['text'] ?? '',
                'icon' => $current['condition']['icon'] ?? '',
                'humidity' => $current['humidity'] ?? null,
                'wind_kph' => $current['wind_kph'] ?? null,
                'uv' => $current['uv'] ?? null,
                'aqi' => $current['air_quality']['us-epa-index'] ?? null,
                'sunrise' => '',
                'sunset' => '',
                'lat' => $location['lat'] ?? null,
                'lon' => $location['lon'] ?? null,
            ];
        }, '/current.json?key=%s&q=%s&aqi=yes');
    }

    public function hourly(string $cityName): array
    {
        return $this->resolveWeather($cityName, 'hourly', 60, function (array $json): array {
            $hours = $json['forecast']['forecastday'][0]['hour'] ?? [];
            return array_map(static fn($h) => [
                'time' => $h['time'] ?? '',
                'temperature' => $h['temp_c'] ?? null,
                'condition' => $h['condition']['text'] ?? '',
                'icon' => $h['condition']['icon'] ?? '',
            ], $hours);
        }, '/forecast.json?key=%s&q=%s&days=%d&aqi=yes');
    }

    public function daily(string $cityName): array
    {
        return $this->resolveWeather($cityName, 'daily', 360, function (array $json): array {
            $days = $json['forecast']['forecastday'] ?? [];
            return array_map(static fn($d) => [
                'day' => $d['date'] ?? '',
                'high' => $d['day']['maxtemp_c'] ?? null,
                'low' => $d['day']['mintemp_c'] ?? null,
                'condition' => $d['day']['condition']['text'] ?? '',
                'icon' => $d['day']['condition']['icon'] ?? '',
                'precipChance' => $d['day']['daily_chance_of_rain'] ?? 0,
            ], $days);
        }, '/forecast.json?key=%s&q=%s&days=%d&aqi=yes');
    }

    public function alerts(string $cityName): array
    {
        $city = $this->ensureCity($cityName);
        $cache = $this->cacheRepository->getValid((int)$city['id'], 'daily');
        if (!$cache) {
            $this->daily($cityName);
        }

        try {
            $url = $this->appConfig['weather_api_base'] . '/alerts.json?key=' . urlencode($this->appConfig['weather_api_key']) . '&q=' . urlencode($cityName);
            $json = $this->requestApi($url);
            $alerts = $json['alerts']['alert'] ?? [];
            $normalized = array_map(static fn($a) => [
                'severity' => $a['severity'] ?? 'info',
                'title' => $a['headline'] ?? 'Alerta',
                'message' => $a['desc'] ?? '',
                'starts_at' => $a['effective'] ?? null,
                'ends_at' => $a['expires'] ?? null,
            ], $alerts);
        } catch (\Throwable) {
            $normalized = [];
        }

        $this->persistAlerts((int)$city['id'], $normalized);
        return $normalized;
    }

    public function summary(string $cityName): array
    {
        return [
            'current' => $this->current($cityName),
            'hourly' => $this->hourly($cityName),
            'daily' => $this->daily($cityName),
            'alerts' => $this->alerts($cityName),
        ];
    }

    public function markers(): array
    {
        $cities = $this->cityRepository->listActive();
        $markers = [];
        foreach ($cities as $city) {
            $current = $this->current((string)$city['name']);
            $markers[] = [
                'id' => (int)$city['id'],
                'name' => $city['name'],
                'country' => $city['country'],
                'lat' => (float)$city['lat'],
                'lon' => (float)$city['lon'],
                'temp' => $current['temp'] ?? null,
                'condition' => $current['condition'] ?? '',
            ];
        }
        return $markers;
    }

    private function resolveWeather(
        string $cityName,
        string $type,
        int $ttlMinutes,
        callable $mapper,
        string $pathTemplate
    ): array
    {
        $city = $this->ensureCity($cityName);
        $cache = $this->cacheRepository->getValid((int)$city['id'], $type);
        if ($cache) {
            return json_decode((string)$cache['payload_json'], true) ?: [];
        }

        try {
            $days = max(1, (int)($this->appConfig['weather_forecast_days'] ?? 3));
            $url = $this->appConfig['weather_api_base'] . sprintf(
                $pathTemplate,
                urlencode($this->appConfig['weather_api_key']),
                urlencode($cityName),
                $days
            );
            $json = $this->requestApi($url);
            $normalized = $mapper($json);
        } catch (\Throwable) {
            $normalized = $this->fallbackWeather($city, $type);
        }

        $expiresAt = date('Y-m-d H:i:s', time() + ($ttlMinutes * 60));
        $this->cacheRepository->put((int)$city['id'], $type, $normalized, 'weatherapi', $expiresAt);

        return $normalized;
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

    private function ensureCity(string $cityName): array
    {
        $city = $this->cityRepository->findByName($cityName);
        if ($city) {
            return $city;
        }

        $id = $this->cityRepository->create([
            'name' => $cityName,
            'country' => 'Unknown',
            'lat' => 0,
            'lon' => 0,
            'is_active' => 1,
        ]);

        return $this->cityRepository->findById($id) ?? [];
    }

    private function persistAlerts(int $cityId, array $alerts): void
    {
        if (empty($alerts)) {
            return;
        }

        $stmt = $this->pdo->prepare(
            'INSERT INTO weather_alerts (city_id, severity, title, message, starts_at, ends_at) VALUES (:city_id, :severity, :title, :message, :starts_at, :ends_at)'
        );
        foreach ($alerts as $alert) {
            $stmt->execute([
                ':city_id' => $cityId,
                ':severity' => $alert['severity'] ?? 'info',
                ':title' => $alert['title'] ?? '',
                ':message' => $alert['message'] ?? '',
                ':starts_at' => $alert['starts_at'],
                ':ends_at' => $alert['ends_at'],
            ]);
        }
    }

    private function fallbackWeather(array $city, string $type): array
    {
        $cityName = (string)($city['name'] ?? 'Luanda');
        $country = (string)($city['country'] ?? 'Angola');
        $lat = (float)($city['lat'] ?? -8.8368);
        $lon = (float)($city['lon'] ?? 13.2344);

        if ($type === 'current') {
            return [
                'city' => $cityName,
                'country' => $country,
                'temp' => 28,
                'feels_like' => 30,
                'condition' => 'Parcialmente Nublado',
                'icon' => '',
                'humidity' => 74,
                'wind_kph' => 14,
                'uv' => 6,
                'aqi' => 42,
                'sunrise' => '06:00 AM',
                'sunset' => '06:00 PM',
                'lat' => $lat,
                'lon' => $lon,
            ];
        }

        if ($type === 'hourly') {
            return [
                ['time' => date('Y-m-d H:00'), 'temperature' => 28, 'condition' => 'Parcialmente Nublado', 'icon' => ''],
                ['time' => date('Y-m-d H:00', strtotime('+1 hour')), 'temperature' => 29, 'condition' => 'Ensolarado', 'icon' => ''],
                ['time' => date('Y-m-d H:00', strtotime('+2 hour')), 'temperature' => 30, 'condition' => 'Nublado', 'icon' => ''],
                ['time' => date('Y-m-d H:00', strtotime('+3 hour')), 'temperature' => 27, 'condition' => 'Vento Fraco', 'icon' => ''],
            ];
        }

        return [
            ['day' => date('Y-m-d'), 'high' => 31, 'low' => 22, 'condition' => 'Ensolarado', 'icon' => '', 'precipChance' => 10],
            ['day' => date('Y-m-d', strtotime('+1 day')), 'high' => 30, 'low' => 21, 'condition' => 'Parcialmente Nublado', 'icon' => '', 'precipChance' => 20],
            ['day' => date('Y-m-d', strtotime('+2 day')), 'high' => 29, 'low' => 20, 'condition' => 'Chuva Fraca', 'icon' => '', 'precipChance' => 45],
        ];
    }
}

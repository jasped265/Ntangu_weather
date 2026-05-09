<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Logger;
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
        // Use forecast endpoint to also capture astro (sunrise/sunset) and avoid partial fields.
        return $this->resolveWeather($cityName, 'current', 10, function (array $json): array {
            $current = $json['current'] ?? [];
            $location = $json['location'] ?? [];
            $day0 = $json['forecast']['forecastday'][0]['day'] ?? [];
            $astro = $json['forecast']['forecastday'][0]['astro'] ?? [];
            return [
                'city' => $location['name'] ?? '',
                'country' => $location['country'] ?? '',
                'temp' => $current['temp_c'] ?? null,
                'feels_like' => $current['feelslike_c'] ?? null,
                'condition' => $current['condition']['text'] ?? '',
                'icon' => $current['condition']['icon'] ?? '',
                'humidity' => $current['humidity'] ?? null,
                'wind_kph' => $current['wind_kph'] ?? null,
                'wind_dir' => $current['wind_dir'] ?? null,
                'pressure_mb' => $current['pressure_mb'] ?? null,
                'vis_km' => $current['vis_km'] ?? null,
                'uv' => $current['uv'] ?? null,
                'aqi' => $current['air_quality']['us-epa-index'] ?? null,
                'sunrise' => $astro['sunrise'] ?? '',
                'sunset' => $astro['sunset'] ?? '',
                'high' => $day0['maxtemp_c'] ?? null,
                'low' => $day0['mintemp_c'] ?? null,
                'lat' => $location['lat'] ?? null,
                'lon' => $location['lon'] ?? null,
            ];
        }, '/forecast.json?key=%s&q=%s&days=%d&aqi=yes');
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

        $url = $this->appConfig['weather_api_base'] . '/alerts.json?key=' . urlencode($this->appConfig['weather_api_key']) . '&q=' . urlencode($cityName);
        $json = $this->requestApiWithCurl($url, $cityName, 'alerts');
        $alerts = $json['alerts']['alert'] ?? [];
        $normalized = array_map(static fn($a) => [
            'severity' => $a['severity'] ?? 'info',
            'title' => $a['headline'] ?? 'Alerta',
            'message' => $a['desc'] ?? '',
            'starts_at' => $a['effective'] ?? null,
            'ends_at' => $a['expires'] ?? null,
        ], $alerts);

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
                'wind_kph' => $current['wind_kph'] ?? null,
                'wind_dir' => $current['wind_dir'] ?? null,
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

        $days = max(1, (int)($this->appConfig['weather_forecast_days'] ?? 3));
        $url = $this->appConfig['weather_api_base'] . sprintf(
            $pathTemplate,
            urlencode($this->appConfig['weather_api_key']),
            urlencode($cityName),
            $days
        );
        $json = $this->requestApiWithCurl($url, $cityName, $type);
        $normalized = $mapper($json);

        // Persist/refresh city geo from WeatherAPI when possible.
        $loc = $json['location'] ?? null;
        if (is_array($loc) && isset($city['id'])) {
            $lat = isset($loc['lat']) ? (float)$loc['lat'] : null;
            $lon = isset($loc['lon']) ? (float)$loc['lon'] : null;
            $country = (string)($loc['country'] ?? ($city['country'] ?? 'Unknown'));
            if ($lat !== null && $lon !== null && ($lat !== 0.0 || $lon !== 0.0)) {
                $this->cityRepository->updateGeo((int)$city['id'], $country, $lat, $lon);
            }
        }

        $expiresAt = date('Y-m-d H:i:s', time() + ($ttlMinutes * 60));
        $this->cacheRepository->put((int)$city['id'], $type, $normalized, 'weatherapi', $expiresAt);

        return $normalized;
    }

    private function requestApi(string $url): array
    {
        if (empty($this->appConfig['weather_api_key'])) {
            Logger::error('WeatherAPI key ausente', [
                'weather_api_base' => $this->appConfig['weather_api_base'] ?? null,
            ]);
            throw new \RuntimeException('Configuração inválida: WEATHERAPI_KEY não configurada', 424);
        }

        return $this->requestApiWithCurl($url, 'n/a', 'generic');
    }

    private function requestApiWithCurl(string $url, string $cityName, string $type): array
    {
        if (!function_exists('curl_init')) {
            Logger::info('cURL indisponível, usando fallback HTTP stream', [
                'city' => $cityName,
                'type' => $type,
                'url' => $url,
            ]);
            return $this->requestApiWithStreams($url, $cityName, $type);
        }

        $ch = curl_init($url);
        if ($ch === false) {
            throw new \RuntimeException('Falha interna ao inicializar cURL', 500);
        }

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_HTTPHEADER => ['Accept: application/json'],
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
        ]);

        $raw = curl_exec($ch);
        $errno = curl_errno($ch);
        $err = curl_error($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($raw === false || $errno !== 0) {
            Logger::error('Falha de transporte ao consultar WeatherAPI', [
                'city' => $cityName,
                'type' => $type,
                'url' => $url,
                'curl_errno' => $errno,
                'curl_error' => $err,
            ]);
            throw new \RuntimeException("Weather API indisponível para '{$cityName}' ({$type}): {$err}", 502);
        }

        $json = json_decode((string)$raw, true);
        if (!is_array($json)) {
            Logger::error('Resposta inválida da WeatherAPI (JSON)', [
                'city' => $cityName,
                'type' => $type,
                'url' => $url,
                'status' => $status,
                'body' => substr((string)$raw, 0, 400),
            ]);
            throw new \RuntimeException("Resposta inválida da Weather API para '{$cityName}' ({$type})", 502);
        }

        if ($status >= 400 || isset($json['error'])) {
            $apiMessage = (string)($json['error']['message'] ?? 'Erro desconhecido');
            $apiCode = (int)($json['error']['code'] ?? 0);
            Logger::error('Erro da WeatherAPI', [
                'city' => $cityName,
                'type' => $type,
                'url' => $url,
                'status' => $status,
                'api_error_code' => $apiCode,
                'api_error_message' => $apiMessage,
            ]);
            $httpCode = $status >= 400 && $status < 500 ? 422 : 502;
            throw new \RuntimeException("Weather API erro para '{$cityName}' ({$type}): {$apiMessage}", $httpCode);
        }

        return $json;
    }

    private function requestApiWithStreams(string $url, string $cityName, string $type): array
    {
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'timeout' => 15,
                'header' => "Accept: application/json\r\n",
                'ignore_errors' => true,
            ],
        ]);

        $raw = @file_get_contents($url, false, $context);
        $status = 0;
        if (isset($http_response_header) && is_array($http_response_header) && isset($http_response_header[0])) {
            if (preg_match('/\s(\d{3})\s/', $http_response_header[0], $m)) {
                $status = (int)$m[1];
            }
        }

        if ($raw === false) {
            Logger::error('Falha de transporte (stream) ao consultar WeatherAPI', [
                'city' => $cityName,
                'type' => $type,
                'url' => $url,
            ]);
            throw new \RuntimeException("Weather API indisponível para '{$cityName}' ({$type})", 502);
        }

        $json = json_decode((string)$raw, true);
        if (!is_array($json)) {
            Logger::error('Resposta inválida da WeatherAPI (stream JSON)', [
                'city' => $cityName,
                'type' => $type,
                'url' => $url,
                'status' => $status,
                'body' => substr((string)$raw, 0, 400),
            ]);
            throw new \RuntimeException("Resposta inválida da Weather API para '{$cityName}' ({$type})", 502);
        }

        if ($status >= 400 || isset($json['error'])) {
            $apiMessage = (string)($json['error']['message'] ?? 'Erro desconhecido');
            $httpCode = $status >= 400 && $status < 500 ? 422 : 502;
            Logger::error('Erro da WeatherAPI (stream)', [
                'city' => $cityName,
                'type' => $type,
                'url' => $url,
                'status' => $status,
                'api_error_message' => $apiMessage,
            ]);
            throw new \RuntimeException("Weather API erro para '{$cityName}' ({$type}): {$apiMessage}", $httpCode);
        }

        return $json;
    }

    private function ensureCity(string $cityName): array
    {
        $city = $this->cityRepository->findByName($cityName);
        if ($city) {
            return $city;
        }

        // Create a placeholder row. Real lat/lon/country will be learned from WeatherAPI
        // on the first successful call and should be updated elsewhere if needed.
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

    // Intentionally no fallback mock data. If WeatherAPI fails, controllers will return an error.
}

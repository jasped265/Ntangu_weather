<?php

declare(strict_types=1);

namespace App\Core;

final class Response
{
    public static function json(bool $success, string $message, mixed $data = null, int $status = 200, array $errors = []): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');

        $payload = [
            'success' => $success,
            'message' => $message,
            'data' => $data ?? new \stdClass(),
            'meta' => [
                'timestamp' => gmdate('c'),
                'requestId' => self::requestId(),
            ],
        ];

        if (!$success && !empty($errors)) {
            $payload['errors'] = $errors;
        }

        echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    }

    public static function csv(string $filename, string $content): void
    {
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        echo $content;
    }

    private static function requestId(): string
    {
        return $_SERVER['HTTP_X_REQUEST_ID'] ?? bin2hex(random_bytes(16));
    }
}

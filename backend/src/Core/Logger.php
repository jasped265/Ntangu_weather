<?php

declare(strict_types=1);

namespace App\Core;

final class Logger
{
    public static function error(string $message, array $context = []): void
    {
        self::write('ERROR', $message, $context);
    }

    public static function info(string $message, array $context = []): void
    {
        self::write('INFO', $message, $context);
    }

    private static function write(string $level, string $message, array $context): void
    {
        $dir = dirname(__DIR__, 2) . '/storage/logs';
        if (!is_dir($dir)) {
            mkdir($dir, 0777, true);
        }

        $line = json_encode([
            'level' => $level,
            'message' => $message,
            'context' => $context,
            'timestamp' => gmdate('c'),
        ], JSON_UNESCAPED_UNICODE);

        file_put_contents($dir . '/app.log', $line . PHP_EOL, FILE_APPEND);
    }
}

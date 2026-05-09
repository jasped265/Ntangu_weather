<?php

declare(strict_types=1);

namespace App\Core;

final class Env
{
    public static function load(string $basePath): void
    {
        $candidates = [
            $basePath . '/.env',
            dirname($basePath) . '/.env',
        ];

        foreach ($candidates as $file) {
            if (!is_file($file) || !is_readable($file)) {
                continue;
            }

            $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            if ($lines === false) {
                continue;
            }

            foreach ($lines as $line) {
                $line = trim($line);
                if ($line === '' || str_starts_with($line, '#')) {
                    continue;
                }

                $parts = explode('=', $line, 2);
                if (count($parts) !== 2) {
                    continue;
                }

                $key = trim($parts[0]);
                $value = trim($parts[1]);
                $value = trim($value, "\"'");
                if ($key === '') {
                    continue;
                }

                if (getenv($key) === false) {
                    putenv($key . '=' . $value);
                }
                if (!array_key_exists($key, $_ENV)) {
                    $_ENV[$key] = $value;
                }
                if (!array_key_exists($key, $_SERVER)) {
                    $_SERVER[$key] = $value;
                }
            }

            // Stop after first valid env file.
            return;
        }
    }
}


<?php

declare(strict_types=1);

namespace App\Services;

final class TokenService
{
    public function __construct(private readonly array $appConfig)
    {
    }

    public function createAccessToken(int $userId, string $role): string
    {
        $header = ['alg' => 'HS256', 'typ' => 'JWT'];
        $iat = time();
        $exp = $iat + ($this->appConfig['jwt_ttl_minutes'] * 60);
        $payload = ['sub' => $userId, 'role' => $role, 'iat' => $iat, 'exp' => $exp];

        $headerEncoded = $this->base64UrlEncode(json_encode($header));
        $payloadEncoded = $this->base64UrlEncode(json_encode($payload));
        $signature = hash_hmac('sha256', $headerEncoded . '.' . $payloadEncoded, $this->appConfig['jwt_secret'], true);

        return $headerEncoded . '.' . $payloadEncoded . '.' . $this->base64UrlEncode($signature);
    }

    public function validateAccessToken(string $jwt): ?array
    {
        $parts = explode('.', $jwt);
        if (count($parts) !== 3) {
            return null;
        }

        [$h, $p, $s] = $parts;
        $expected = $this->base64UrlEncode(hash_hmac('sha256', $h . '.' . $p, $this->appConfig['jwt_secret'], true));
        if (!hash_equals($expected, $s)) {
            return null;
        }

        $payload = json_decode($this->base64UrlDecode($p), true);
        if (!is_array($payload) || ($payload['exp'] ?? 0) < time()) {
            return null;
        }

        return $payload;
    }

    public function createRefreshToken(): string
    {
        return bin2hex(random_bytes(64));
    }

    public function hashRefreshToken(string $token): string
    {
        return hash('sha256', $token);
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private function base64UrlDecode(string $value): string
    {
        return base64_decode(strtr($value, '-_', '+/')) ?: '';
    }
}

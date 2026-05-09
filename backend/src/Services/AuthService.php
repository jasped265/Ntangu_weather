<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\UserRepository;
use PDO;

final class AuthService
{
    public function __construct(
        private readonly PDO $pdo,
        private readonly UserRepository $userRepository,
        private readonly TokenService $tokenService,
        private readonly array $appConfig
    ) {
    }

    public function register(string $name, string $email, string $password): array
    {
        $exists = $this->userRepository->findByEmail($email);
        if ($exists) {
            throw new \RuntimeException('Email já registado');
        }

        $hash = password_hash($password, PASSWORD_ARGON2ID);
        $id = $this->userRepository->create($name, $email, $hash, 'user');

        return $this->issueTokens($id, 'user');
    }

    public function login(string $email, string $password): array
    {
        $user = $this->userRepository->findByEmail($email);
        if (!$user || !password_verify($password, $user['password_hash'])) {
            throw new \RuntimeException('Credenciais inválidas');
        }

        if (($user['status'] ?? 'active') !== 'active') {
            throw new \RuntimeException('Utilizador inactivo');
        }

        return $this->issueTokens((int)$user['id'], (string)$user['role']);
    }

    public function refresh(string $refreshToken): array
    {
        $tokenHash = $this->tokenService->hashRefreshToken($refreshToken);
        $sql = 'SELECT * FROM refresh_tokens WHERE token_hash = :token_hash AND revoked_at IS NULL AND expires_at > NOW() LIMIT 1';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':token_hash' => $tokenHash]);
        $row = $stmt->fetch();
        if (!$row) {
            throw new \RuntimeException('Refresh token inválido');
        }

        $user = $this->userRepository->findById((int)$row['user_id']);
        if (!$user) {
            throw new \RuntimeException('Utilizador não encontrado');
        }

        $this->revokeRefreshToken($refreshToken);
        return $this->issueTokens((int)$user['id'], (string)$user['role']);
    }

    public function logout(string $refreshToken): void
    {
        $this->revokeRefreshToken($refreshToken);
    }

    public function createForgotPasswordToken(string $email): string
    {
        $user = $this->userRepository->findByEmail($email);
        if (!$user) {
            return '';
        }

        $token = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $token);
        $expiresAt = date('Y-m-d H:i:s', time() + 3600);

        $stmt = $this->pdo->prepare('INSERT INTO password_resets (email, token_hash, expires_at) VALUES (:email, :token_hash, :expires_at)');
        $stmt->execute([':email' => $email, ':token_hash' => $tokenHash, ':expires_at' => $expiresAt]);

        return $token;
    }

    public function resetPassword(string $token, string $newPassword): void
    {
        $hash = hash('sha256', $token);
        $sql = 'SELECT * FROM password_resets WHERE token_hash = :token_hash AND used_at IS NULL AND expires_at > NOW() LIMIT 1';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':token_hash' => $hash]);
        $row = $stmt->fetch();
        if (!$row) {
            throw new \RuntimeException('Token inválido ou expirado');
        }

        $passwordHash = password_hash($newPassword, PASSWORD_ARGON2ID);
        $this->userRepository->updatePasswordByEmail((string)$row['email'], $passwordHash);

        $update = $this->pdo->prepare('UPDATE password_resets SET used_at = NOW() WHERE id = :id');
        $update->execute([':id' => $row['id']]);
    }

    private function issueTokens(int $userId, string $role): array
    {
        $accessToken = $this->tokenService->createAccessToken($userId, $role);
        $refreshToken = $this->tokenService->createRefreshToken();
        $tokenHash = $this->tokenService->hashRefreshToken($refreshToken);
        $expiresAt = date('Y-m-d H:i:s', time() + ($this->appConfig['refresh_ttl_days'] * 86400));

        $stmt = $this->pdo->prepare('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (:user_id, :token_hash, :expires_at)');
        $stmt->execute([':user_id' => $userId, ':token_hash' => $tokenHash, ':expires_at' => $expiresAt]);

        $user = $this->userRepository->findById($userId);
        return [
            'access_token' => $accessToken,
            'refresh_token' => $refreshToken,
            'token_type' => 'Bearer',
            'expires_in' => $this->appConfig['jwt_ttl_minutes'] * 60,
            'user' => $user,
        ];
    }

    private function revokeRefreshToken(string $refreshToken): void
    {
        $hash = $this->tokenService->hashRefreshToken($refreshToken);
        $stmt = $this->pdo->prepare('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = :token_hash AND revoked_at IS NULL');
        $stmt->execute([':token_hash' => $hash]);
    }
}

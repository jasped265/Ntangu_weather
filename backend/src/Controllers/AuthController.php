<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Repositories\UserRepository;
use App\Services\AuthService;

final class AuthController
{
    public function __construct(
        private readonly AuthService $authService,
        private readonly UserRepository $userRepository
    ) {
    }

    public function register(Request $request): void
    {
        $name = trim((string)$request->input('name'));
        $email = trim((string)$request->input('email'));
        $password = (string)$request->input('password');
        $terms = (bool)$request->input('terms', false);

        if ($name === '' || $email === '' || $password === '' || !$terms) {
            Response::json(false, 'Validation failed', null, 422, ['fields' => ['name/email/password/terms são obrigatórios']]);
            return;
        }

        try {
            $data = $this->authService->register($name, $email, $password);
            Response::json(true, 'Conta criada com sucesso', $data, 201);
        } catch (\Throwable $e) {
            Response::json(false, $e->getMessage(), null, 422);
        }
    }

    public function login(Request $request): void
    {
        $email = trim((string)$request->input('email'));
        $password = (string)$request->input('password');
        if ($email === '' || $password === '') {
            Response::json(false, 'Validation failed', null, 422, ['fields' => ['email e password são obrigatórios']]);
            return;
        }

        try {
            $data = $this->authService->login($email, $password);
            Response::json(true, 'Login com sucesso', $data);
        } catch (\Throwable $e) {
            Response::json(false, $e->getMessage(), null, 401);
        }
    }

    public function refresh(Request $request): void
    {
        $refreshToken = (string)$request->input('refresh_token');
        if ($refreshToken === '') {
            Response::json(false, 'refresh_token é obrigatório', null, 422);
            return;
        }
        try {
            $data = $this->authService->refresh($refreshToken);
            Response::json(true, 'Token renovado', $data);
        } catch (\Throwable $e) {
            Response::json(false, $e->getMessage(), null, 401);
        }
    }

    public function logout(Request $request): void
    {
        $refreshToken = (string)$request->input('refresh_token');
        if ($refreshToken === '') {
            Response::json(false, 'refresh_token é obrigatório', null, 422);
            return;
        }
        $this->authService->logout($refreshToken);
        Response::json(true, 'Logout realizado', null);
    }

    public function me(Request $request): void
    {
        $user = $this->userRepository->findById((int)$request->user['id']);
        Response::json(true, 'Utilizador autenticado', $user);
    }

    public function forgotPassword(Request $request): void
    {
        $email = trim((string)$request->input('email'));
        if ($email === '') {
            Response::json(false, 'email é obrigatório', null, 422);
            return;
        }
        $token = $this->authService->createForgotPasswordToken($email);
        Response::json(true, 'Token de recuperação gerado', ['reset_token' => $token]);
    }

    public function resetPassword(Request $request): void
    {
        $token = (string)$request->input('token');
        $password = (string)$request->input('password');
        if ($token === '' || $password === '') {
            Response::json(false, 'token e password são obrigatórios', null, 422);
            return;
        }
        try {
            $this->authService->resetPassword($token, $password);
            Response::json(true, 'Senha actualizada com sucesso', null);
        } catch (\Throwable $e) {
            Response::json(false, $e->getMessage(), null, 422);
        }
    }
}

<?php

declare(strict_types=1);

use App\Core\DB;

require_once dirname(__DIR__) . '/src/Core/DB.php';

$dbConfig = require dirname(__DIR__) . '/config/db.php';
$pdo = DB::getConnection($dbConfig);

// Inserir utilizadores base.
$users = [
    ['Admin Ntangu', 'admin@ntangu.ao', 'Admin123!', 'admin'],
    ['Utilizador Ntangu', 'user@ntangu.ao', 'User123!', 'user'],
];

$stmtUser = $pdo->prepare(
    'INSERT INTO users (name, email, password_hash, role) VALUES (:name, :email, :password_hash, :role)
     ON DUPLICATE KEY UPDATE name = VALUES(name), role = VALUES(role)'
);

foreach ($users as [$name, $email, $password, $role]) {
    $stmtUser->execute([
        ':name' => $name,
        ':email' => $email,
        ':password_hash' => password_hash($password, PASSWORD_ARGON2ID),
        ':role' => $role,
    ]);
}

// Inserir cidades de Angola e Africa.
$cities = [
    ['Luanda', 'Angola', -8.839000, 13.289400],
    ['Benguela', 'Angola', -12.576300, 13.405500],
    ['Lubango', 'Angola', -14.917200, 13.492500],
    ['Huambo', 'Angola', -12.776100, 15.739200],
    ['Cabinda', 'Angola', -5.560000, 12.190000],
    ['Nairobi', 'Kenya', -1.286389, 36.817223],
    ['Lagos', 'Nigeria', 6.524379, 3.379206],
    ['Accra', 'Ghana', 5.603717, -0.186964],
    ['Dakar', 'Senegal', 14.716677, -17.467686],
    ['Maputo', 'Mozambique', -25.969248, 32.573174],
];

$stmtCity = $pdo->prepare(
    'INSERT INTO cities (name, country, lat, lon, is_active) VALUES (:name, :country, :lat, :lon, 1)
     ON DUPLICATE KEY UPDATE lat = VALUES(lat), lon = VALUES(lon), is_active = 1'
);
foreach ($cities as [$name, $country, $lat, $lon]) {
    $stmtCity->execute([
        ':name' => $name,
        ':country' => $country,
        ':lat' => $lat,
        ':lon' => $lon,
    ]);
}

// Garantir configuração inicial de utilizadores.
$usersRows = $pdo->query('SELECT id FROM users')->fetchAll();
$stmtSettings = $pdo->prepare(
    "INSERT INTO user_settings (user_id, theme, language, temperature_unit, notify_email, notify_push, notify_alerts)
     VALUES (:user_id, 'dark', 'pt', 'celsius', 1, 1, 1)
     ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP"
);
foreach ($usersRows as $row) {
    $stmtSettings->execute([':user_id' => $row['id']]);
}

echo "Seed concluído com sucesso." . PHP_EOL;

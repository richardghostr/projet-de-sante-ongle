<?php
// Basic bootstrap for prototype
date_default_timezone_set('UTC');

// Load config from env or .env
$config = [
    'db' => [
        'host' => getenv('DB_HOST') ?: 'db',
        'port' => getenv('DB_PORT') ?: '3306',
        'database' => getenv('DB_NAME') ?: 'unguealhealth',
        'user' => getenv('DB_USER') ?: 'uh_user',
        'pass' => getenv('DB_PASS') ?: 'uh_pass',
    ],
    'uploads_dir' => __DIR__ . '/../storage/uploads'
];

if (!is_dir($config['uploads_dir'])) {
    mkdir($config['uploads_dir'], 0755, true);
}

// Simple PDO connection factory (lazy)
$pdo = null;
function get_db() {
    global $pdo, $config;
    if ($pdo) return $pdo;
    $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $config['db']['host'], $config['db']['port'], $config['db']['database']);
    try {
        $pdo = new PDO($dsn, $config['db']['user'], $config['db']['pass'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    } catch (Exception $e) {
        // For prototype, do not die; API will fallback to file storage
        $pdo = null;
    }
    return $pdo;
}

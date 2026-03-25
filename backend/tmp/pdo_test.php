<?php
try {
    $pdo = new PDO('mysql:host=db;port=3306;dbname=unguealhealth;charset=utf8mb4', 'uh_user', 'uh_pass', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
    echo "OK\n";
} catch (Exception $e) {
    echo "ERR: " . $e->getMessage() . "\n";
}

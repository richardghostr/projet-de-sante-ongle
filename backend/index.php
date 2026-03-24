<?php
// Simple router for prototype API
require __DIR__ . '/src/bootstrap.php';

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

header('Content-Type: application/json');

if ($uri === '/' && $method === 'GET') {
    echo json_encode(['status' => 'ok', 'service' => 'unguealhealth backend']);
    exit;
}

// API routes
if (strpos($uri, '/api/') === 0) {
    require __DIR__ . '/src/Api.php';
    exit;
}

// serve static files (uploads)
$path = __DIR__ . $uri;
if (file_exists($path) && is_file($path)) {
    $mime = mime_content_type($path);
    header('Content-Type: ' . $mime);
    readfile($path);
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'Not Found']);

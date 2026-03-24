<?php
require_once __DIR__ . '/bootstrap.php';

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

// simple router for API endpoints
switch (true) {
    case $uri === '/api/register' && $method === 'POST':
        require __DIR__ . '/controllers/AuthController.php';
        AuthController::register();
        break;
    case $uri === '/api/login' && $method === 'POST':
        require __DIR__ . '/controllers/AuthController.php';
        AuthController::login();
        break;
    case $uri === '/api/upload-image' && $method === 'POST':
        require __DIR__ . '/controllers/AnalysisController.php';
        AnalysisController::uploadImage();
        break;
    case $uri === '/api/analyze-image' && $method === 'POST':
        require __DIR__ . '/controllers/AnalysisController.php';
        AnalysisController::analyzeImage();
        break;
    case preg_match('#^/api/history(?:/([0-9]+))?$#', $uri, $m) && $method === 'GET':
        require __DIR__ . '/controllers/HistoryController.php';
        HistoryController::get(isset($m[1]) ? $m[1] : null);
        break;
    case preg_match('#^/api/history/([0-9]+)$#', $uri, $m) && $method === 'DELETE':
        require __DIR__ . '/controllers/HistoryController.php';
        HistoryController::delete($m[1]);
        break;
    case $uri === '/api/profile' && $method === 'GET':
        require __DIR__ . '/controllers/ProfileController.php';
        ProfileController::get();
        break;
    case $uri === '/api/profile' && $method === 'PUT':
        require __DIR__ . '/controllers/ProfileController.php';
        ProfileController::update();
        break;
    default:
        http_response_code(404);
        echo json_encode(['error' => 'API route not found']);
}

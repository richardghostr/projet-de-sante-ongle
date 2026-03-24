<?php
/**
 * UNGUEALHEALTH - Backend Entry Point
 * Point d'entree principal du backend PHP
 */

// Charger le bootstrap
require __DIR__ . '/src/bootstrap.php';

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

// Route racine - Status du service
if ($uri === '/' && $method === 'GET') {
    global $config;
    Response::success([
        'service' => 'UnguealHealth API',
        'version' => $config['app']['version'],
        'status' => 'running',
        'documentation' => '/api/docs',
        'endpoints' => [
            'auth' => [
                'POST /api/register' => 'Inscription',
                'POST /api/login' => 'Connexion',
                'POST /api/logout' => 'Deconnexion',
                'GET /api/me' => 'Utilisateur connecte',
            ],
            'analysis' => [
                'POST /api/upload' => 'Upload image',
                'POST /api/analyze' => 'Lancer analyse',
                'GET /api/analysis/:id' => 'Detail analyse',
            ],
            'history' => [
                'GET /api/history' => 'Liste analyses',
                'GET /api/history/:id' => 'Detail analyse',
                'DELETE /api/history/:id' => 'Supprimer',
                'GET /api/history/stats' => 'Statistiques',
            ],
            'profile' => [
                'GET /api/profile' => 'Profil',
                'PUT /api/profile' => 'Modifier profil',
                'POST /api/profile/avatar' => 'Upload avatar',
            ],
            'utils' => [
                'GET /api/health' => 'Health check',
                'GET /api/pathologies' => 'Liste pathologies',
            ]
        ]
    ]);
}

// Routes API
if (strpos($uri, '/api/') === 0 || strpos($uri, '/api') === 0) {
    require __DIR__ . '/src/Api.php';
    exit;
}

// Servir les fichiers statiques (uploads, avatars, etc.)
if (strpos($uri, '/storage/') === 0) {
    $filePath = __DIR__ . $uri;
    
    if (file_exists($filePath) && is_file($filePath)) {
        // Determiner le type MIME
        $mimeTypes = [
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'webp' => 'image/webp',
            'gif' => 'image/gif',
            'json' => 'application/json',
        ];
        
        $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
        $mime = $mimeTypes[$ext] ?? mime_content_type($filePath);
        
        // Headers de cache pour les images
        if (strpos($mime, 'image/') === 0) {
            header('Cache-Control: public, max-age=31536000');
            header('Expires: ' . gmdate('D, d M Y H:i:s', time() + 31536000) . ' GMT');
        }
        
        header('Content-Type: ' . $mime);
        header('Content-Length: ' . filesize($filePath));
        readfile($filePath);
        exit;
    }
    
    Response::notFound('Fichier non trouve');
}

// Documentation API simple
if ($uri === '/api/docs' || $uri === '/docs') {
    header('Content-Type: text/html; charset=utf-8');
    ?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>UnguealHealth API Documentation</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f7fa; color: #1a1a2e; line-height: 1.6; }
        .container { max-width: 1000px; margin: 0 auto; padding: 40px 20px; }
        h1 { color: #0B6FA8; margin-bottom: 10px; }
        .subtitle { color: #6b7280; margin-bottom: 40px; }
        .section { background: #fff; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        h2 { color: #0B6FA8; margin-bottom: 16px; font-size: 1.25rem; }
        .endpoint { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
        .endpoint:last-child { border-bottom: none; }
        .method { font-weight: 600; font-size: 0.75rem; padding: 4px 8px; border-radius: 4px; min-width: 60px; text-align: center; }
        .method.get { background: #10b981; color: #fff; }
        .method.post { background: #3b82f6; color: #fff; }
        .method.put { background: #f59e0b; color: #fff; }
        .method.delete { background: #ef4444; color: #fff; }
        .path { font-family: 'Monaco', 'Menlo', monospace; font-size: 0.9rem; color: #374151; }
        .desc { color: #6b7280; font-size: 0.9rem; margin-left: auto; }
        .auth-badge { background: #fef3c7; color: #92400e; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>UnguealHealth API</h1>
        <p class="subtitle">Documentation des endpoints REST</p>
        
        <div class="section">
            <h2>Authentification</h2>
            <div class="endpoint">
                <span class="method post">POST</span>
                <span class="path">/api/register</span>
                <span class="desc">Inscription d'un nouvel utilisateur</span>
            </div>
            <div class="endpoint">
                <span class="method post">POST</span>
                <span class="path">/api/login</span>
                <span class="desc">Connexion utilisateur</span>
            </div>
            <div class="endpoint">
                <span class="method post">POST</span>
                <span class="path">/api/logout</span>
                <span class="desc">Deconnexion</span>
                <span class="auth-badge">Auth</span>
            </div>
            <div class="endpoint">
                <span class="method get">GET</span>
                <span class="path">/api/me</span>
                <span class="desc">Obtenir l'utilisateur connecte</span>
                <span class="auth-badge">Auth</span>
            </div>
        </div>
        
        <div class="section">
            <h2>Analyse d'images</h2>
            <div class="endpoint">
                <span class="method post">POST</span>
                <span class="path">/api/upload</span>
                <span class="desc">Telecharger une image d'ongle</span>
            </div>
            <div class="endpoint">
                <span class="method post">POST</span>
                <span class="path">/api/analyze</span>
                <span class="desc">Lancer l'analyse IA</span>
            </div>
            <div class="endpoint">
                <span class="method get">GET</span>
                <span class="path">/api/analysis/:id</span>
                <span class="desc">Detail d'une analyse</span>
            </div>
            <div class="endpoint">
                <span class="method post">POST</span>
                <span class="path">/api/analysis/:id/feedback</span>
                <span class="desc">Soumettre un feedback</span>
            </div>
        </div>
        
        <div class="section">
            <h2>Historique</h2>
            <div class="endpoint">
                <span class="method get">GET</span>
                <span class="path">/api/history</span>
                <span class="desc">Liste des analyses</span>
            </div>
            <div class="endpoint">
                <span class="method get">GET</span>
                <span class="path">/api/history/stats</span>
                <span class="desc">Statistiques utilisateur</span>
                <span class="auth-badge">Auth</span>
            </div>
            <div class="endpoint">
                <span class="method get">GET</span>
                <span class="path">/api/history/:id</span>
                <span class="desc">Detail d'une analyse</span>
            </div>
            <div class="endpoint">
                <span class="method delete">DELETE</span>
                <span class="path">/api/history/:id</span>
                <span class="desc">Supprimer une analyse</span>
                <span class="auth-badge">Auth</span>
            </div>
        </div>
        
        <div class="section">
            <h2>Profil utilisateur</h2>
            <div class="endpoint">
                <span class="method get">GET</span>
                <span class="path">/api/profile</span>
                <span class="desc">Obtenir le profil</span>
                <span class="auth-badge">Auth</span>
            </div>
            <div class="endpoint">
                <span class="method put">PUT</span>
                <span class="path">/api/profile</span>
                <span class="desc">Modifier le profil</span>
                <span class="auth-badge">Auth</span>
            </div>
            <div class="endpoint">
                <span class="method post">POST</span>
                <span class="path">/api/profile/avatar</span>
                <span class="desc">Telecharger un avatar</span>
                <span class="auth-badge">Auth</span>
            </div>
            <div class="endpoint">
                <span class="method delete">DELETE</span>
                <span class="path">/api/profile</span>
                <span class="desc">Supprimer le compte</span>
                <span class="auth-badge">Auth</span>
            </div>
        </div>
        
        <div class="section">
            <h2>Utilitaires</h2>
            <div class="endpoint">
                <span class="method get">GET</span>
                <span class="path">/api/health</span>
                <span class="desc">Verification de sante du service</span>
            </div>
            <div class="endpoint">
                <span class="method get">GET</span>
                <span class="path">/api/pathologies</span>
                <span class="desc">Liste des pathologies connues</span>
            </div>
            <div class="endpoint">
                <span class="method get">GET</span>
                <span class="path">/api/stats</span>
                <span class="desc">Statistiques globales</span>
            </div>
        </div>
    </div>
</body>
</html>
    <?php
    exit;
}

// 404 pour toute autre route
Response::notFound('Endpoint non trouve');

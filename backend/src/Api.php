<?php
/**
 * UNGUEALHEALTH - API Router
 * Gestion centralisee des routes API
 */

require_once __DIR__ . '/bootstrap.php';

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

// Normaliser l'URI (supprimer /api prefix si present)
$uri = preg_replace('#^/api#', '', $uri);
$uri = rtrim($uri, '/');
if (empty($uri)) $uri = '/';

// Router les requetes
try {
    
    // ============================================
    // Routes d'authentification
    // ============================================
    
    if ($uri === '/register' && $method === 'POST') {
        require_once __DIR__ . '/controllers/AuthController.php';
        AuthController::register();
    }
    
    elseif ($uri === '/login' && $method === 'POST') {
        require_once __DIR__ . '/controllers/AuthController.php';
        AuthController::login();
    }
    
    elseif ($uri === '/logout' && $method === 'POST') {
        require_once __DIR__ . '/controllers/AuthController.php';
        AuthController::logout();
    }
    
    elseif ($uri === '/me' && $method === 'GET') {
        require_once __DIR__ . '/controllers/AuthController.php';
        AuthController::me();
    }
    
    elseif ($uri === '/forgot-password' && $method === 'POST') {
        require_once __DIR__ . '/controllers/AuthController.php';
        AuthController::forgotPassword();
    }
    
    elseif ($uri === '/change-password' && $method === 'PUT') {
        require_once __DIR__ . '/controllers/AuthController.php';
        AuthController::changePassword();
    }
    
    // ============================================
    // Routes d'analyse
    // ============================================
    
    elseif ($uri === '/upload' && $method === 'POST') {
        require_once __DIR__ . '/controllers/AnalysisController.php';
        AnalysisController::upload();
    }
    
    // Alias pour compatibilite
    elseif ($uri === '/upload-image' && $method === 'POST') {
        require_once __DIR__ . '/controllers/AnalysisController.php';
        AnalysisController::upload();
    }
    
    elseif ($uri === '/analyze' && $method === 'POST') {
        require_once __DIR__ . '/controllers/AnalysisController.php';
        AnalysisController::analyze();
    }
    
    // Alias pour compatibilite
    elseif ($uri === '/analyze-image' && $method === 'POST') {
        require_once __DIR__ . '/controllers/AnalysisController.php';
        AnalysisController::analyze();
    }
    
    elseif (preg_match('#^/analysis/([a-zA-Z0-9-]+)$#', $uri, $matches) && $method === 'GET') {
        require_once __DIR__ . '/controllers/AnalysisController.php';
        AnalysisController::get($matches[1]);
    }
    
    elseif (preg_match('#^/analysis/([a-zA-Z0-9-]+)/feedback$#', $uri, $matches) && $method === 'POST') {
        require_once __DIR__ . '/controllers/AnalysisController.php';
        AnalysisController::feedback($matches[1]);
    }
    
    // ============================================
    // Routes d'historique
    // ============================================
    
    elseif ($uri === '/history' && $method === 'GET') {
        require_once __DIR__ . '/controllers/HistoryController.php';
        HistoryController::index();
    }
    
    elseif ($uri === '/history/stats' && $method === 'GET') {
        require_once __DIR__ . '/controllers/HistoryController.php';
        HistoryController::stats();
    }

    elseif ($uri === '/history/export' && $method === 'GET') {
        require_once __DIR__ . '/controllers/HistoryController.php';
        HistoryController::export();
    }
    
    elseif (preg_match('#^/history/([a-zA-Z0-9-]+)$#', $uri, $matches) && $method === 'GET') {
        require_once __DIR__ . '/controllers/HistoryController.php';
        HistoryController::show($matches[1]);
    }
    
    elseif (preg_match('#^/history/([a-zA-Z0-9-]+)$#', $uri, $matches) && $method === 'DELETE') {
        require_once __DIR__ . '/controllers/HistoryController.php';
        HistoryController::delete($matches[1]);
    }
    
    // ============================================
    // Routes de profil
    // ============================================
    
    elseif ($uri === '/profile' && $method === 'GET') {
        require_once __DIR__ . '/controllers/ProfileController.php';
        ProfileController::get();
    }
    
    elseif ($uri === '/profile' && $method === 'PUT') {
        require_once __DIR__ . '/controllers/ProfileController.php';
        ProfileController::update();
    }
    
    elseif ($uri === '/profile' && $method === 'DELETE') {
        require_once __DIR__ . '/controllers/ProfileController.php';
        ProfileController::delete();
    }
    
    elseif ($uri === '/profile/email' && $method === 'PUT') {
        require_once __DIR__ . '/controllers/ProfileController.php';
        ProfileController::updateEmail();
    }
    
    elseif ($uri === '/profile/consent' && $method === 'PUT') {
        require_once __DIR__ . '/controllers/ProfileController.php';
        ProfileController::updateConsent();
    }
    
    elseif ($uri === '/profile/avatar' && $method === 'POST') {
        require_once __DIR__ . '/controllers/ProfileController.php';
        ProfileController::uploadAvatar();
    }
    
    // ============================================
    // Routes utilitaires
    // ============================================
    
    elseif ($uri === '/pathologies' && $method === 'GET') {
        // Lister les pathologies connues
        $pdo = get_db();
        if ($pdo) {
            $pathologies = db()->fetchAll(
                'SELECT code, nom, nom_scientifique, description, niveau_gravite, contagieux 
                 FROM pathologies WHERE active = 1 ORDER BY nom'
            );
            Response::success(['pathologies' => $pathologies]);
        } else {
            // Donnees statiques en fallback
            Response::success(['pathologies' => [
                ['code' => 'ONYCHO', 'nom' => 'Onychomycose', 'niveau_gravite' => 'modere'],
                ['code' => 'PSORIASIS', 'nom' => 'Psoriasis ungueal', 'niveau_gravite' => 'modere'],
                ['code' => 'MELANONYCHIE', 'nom' => 'Melanonychie', 'niveau_gravite' => 'eleve'],
                ['code' => 'SAIN', 'nom' => 'Ongle sain', 'niveau_gravite' => 'faible'],
            ]]);
        }
    }
    
    elseif ($uri === '/health' && $method === 'GET') {
        // Health check
        $dbStatus = db()->isConnected() ? 'connected' : 'disconnected';
        $iaStatus = 'unknown';
        
        // Tester le service IA
        global $config;
        $ch = curl_init($config['ia']['url'] . '/health');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        $iaResponse = curl_exec($ch);
        $iaCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($iaCode === 200) {
            $iaStatus = 'healthy';
        } else {
            $iaStatus = 'unhealthy';
        }
        
        Response::success([
            'status' => 'ok',
            'service' => 'unguealhealth-api',
            'version' => $config['app']['version'],
            'database' => $dbStatus,
            'ia_service' => $iaStatus,
            'timestamp' => date('c')
        ]);
    }
    
    elseif ($uri === '/stats' && $method === 'GET') {
        // Statistiques globales (publiques)
        $stats = [
            'total_analyses' => 0,
            'total_users' => 0,
            'analyses_today' => 0
        ];
        
        $pdo = get_db();
        if ($pdo) {
            $result = db()->fetchOne('SELECT COUNT(*) as total FROM analyses');
            $stats['total_analyses'] = (int)($result['total'] ?? 0);
            
            $result = db()->fetchOne('SELECT COUNT(*) as total FROM users WHERE status = "active"');
            $stats['total_users'] = (int)($result['total'] ?? 0);
            
            $result = db()->fetchOne('SELECT COUNT(*) as total FROM analyses WHERE DATE(date_analyse) = CURDATE()');
            $stats['analyses_today'] = (int)($result['total'] ?? 0);
        }
        
        Response::success($stats);
    }
    
    // ============================================
    // Route par defaut - 404
    // ============================================
    
    else {
        Response::error("Route non trouvee: $method $uri", 404);
    }
    
} catch (Exception $e) {
    Logger::critical('API Error', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
    Response::serverError('Une erreur interne est survenue');
}

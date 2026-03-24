<?php
/**
 * UNGUEALHEALTH - AuthController
 * Gestion de l'authentification et des utilisateurs
 */

class AuthController {
    
    /**
     * POST /api/register - Inscription d'un nouvel utilisateur
     */
    public static function register() {
        $data = getRequestBody();
        
        // Validation
        $validator = new Validator($data);
        $validator
            ->required('nom', 'Le nom est requis')
            ->required('email', 'L\'email est requis')
            ->required('password', 'Le mot de passe est requis')
            ->email('email', 'L\'email n\'est pas valide')
            ->minLength('password', 8, 'Le mot de passe doit contenir au moins 8 caracteres')
            ->maxLength('nom', 150, 'Le nom ne doit pas depasser 150 caracteres')
            ->validate();
        
        $email = strtolower(trim($data['email']));
        $nom = trim($data['nom']);
        $prenom = isset($data['prenom']) ? trim($data['prenom']) : null;
        $passwordHash = password_hash($data['password'], PASSWORD_BCRYPT, ['cost' => 12]);
        
        // Verifier si l'email existe deja
        if (self::emailExists($email)) {
            Response::error('Cet email est deja utilise', 409);
        }
        
        $userData = [
            'nom' => $nom,
            'prenom' => $prenom,
            'email' => $email,
            'password_hash' => $passwordHash,
            'role' => 'user',
            'status' => 'active',
            'consent_data' => isset($data['consent_data']) ? (int)$data['consent_data'] : 0,
            'consent_date' => isset($data['consent_data']) && $data['consent_data'] ? date('Y-m-d H:i:s') : null,
            'created_at' => date('Y-m-d H:i:s'),
        ];
        
        // Essayer d'inserer en base
        $pdo = get_db();
        if ($pdo) {
            try {
                $userId = db()->insert('users', $userData);
                if ($userId) {
                    Logger::info('User registered', ['user_id' => $userId, 'email' => $email]);
                    self::logAction($userId, 'register', 'Inscription reussie');
                    
                    // Generer le token JWT
                    $token = JWT::encode(['user_id' => $userId, 'email' => $email, 'role' => 'user']);
                    
                    Response::created([
                        'user' => [
                            'id' => $userId,
                            'nom' => $nom,
                            'prenom' => $prenom,
                            'email' => $email,
                            'role' => 'user'
                        ],
                        'token' => $token
                    ], 'Inscription reussie');
                }
            } catch (Exception $e) {
                Logger::error('Registration failed', ['error' => $e->getMessage()]);
                Response::error('Erreur lors de l\'inscription', 500);
            }
        }
        
        // Fallback fichier JSON
        $userData['id'] = time() . mt_rand(1000, 9999);
        $usersFile = __DIR__ . '/../../storage/data/users.json';
        $users = [];
        if (file_exists($usersFile)) {
            $users = json_decode(file_get_contents($usersFile), true) ?: [];
        }
        
        $users[] = $userData;
        file_put_contents($usersFile, json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        
        $token = JWT::encode(['user_id' => $userData['id'], 'email' => $email, 'role' => 'user']);
        
        Logger::info('User registered (file)', ['user_id' => $userData['id'], 'email' => $email]);
        
        Response::created([
            'user' => [
                'id' => $userData['id'],
                'nom' => $nom,
                'prenom' => $prenom,
                'email' => $email,
                'role' => 'user'
            ],
            'token' => $token
        ], 'Inscription reussie');
    }
    
    /**
     * POST /api/login - Connexion utilisateur
     */
    public static function login() {
        $data = getRequestBody();
        
        // Validation
        $validator = new Validator($data);
        $validator
            ->required('email', 'L\'email est requis')
            ->required('password', 'Le mot de passe est requis')
            ->email('email', 'L\'email n\'est pas valide')
            ->validate();
        
        $email = strtolower(trim($data['email']));
        $password = $data['password'];
        
        $user = null;
        
        // Chercher en base
        $pdo = get_db();
        if ($pdo) {
            $user = db()->fetchOne(
                'SELECT id, nom, prenom, email, password_hash, role, status, avatar_url FROM users WHERE email = ?',
                [$email]
            );
        }
        
        // Fallback fichier
        if (!$user) {
            $user = self::getUserFromFile($email);
        }
        
        if (!$user) {
            Logger::warning('Login failed - user not found', ['email' => $email]);
            Response::error('Email ou mot de passe incorrect', 401);
        }
        
        // Verifier le statut
        if (isset($user['status']) && $user['status'] !== 'active') {
            Logger::warning('Login failed - account inactive', ['email' => $email, 'status' => $user['status']]);
            Response::error('Votre compte est desactive', 403);
        }
        
        // Verifier le mot de passe
        if (!password_verify($password, $user['password_hash'])) {
            Logger::warning('Login failed - wrong password', ['email' => $email]);
            Response::error('Email ou mot de passe incorrect', 401);
        }
        
        // Mettre a jour last_login
        if ($pdo) {
            db()->update('users', [
                'last_login' => date('Y-m-d H:i:s'),
                'login_count' => ($user['login_count'] ?? 0) + 1
            ], 'id = ?', [$user['id']]);
        }
        
        // Generer le token JWT
        $token = JWT::encode([
            'user_id' => $user['id'],
            'email' => $user['email'],
            'role' => $user['role'] ?? 'user'
        ]);
        
        // Logger la connexion
        self::logAction($user['id'], 'login', 'Connexion reussie');
        Logger::info('User logged in', ['user_id' => $user['id'], 'email' => $email]);
        
        Response::success([
            'user' => [
                'id' => $user['id'],
                'nom' => $user['nom'],
                'prenom' => $user['prenom'] ?? null,
                'email' => $user['email'],
                'role' => $user['role'] ?? 'user',
                'avatar_url' => $user['avatar_url'] ?? null
            ],
            'token' => $token
        ], 'Connexion reussie');
    }
    
    /**
     * POST /api/logout - Deconnexion
     */
    public static function logout() {
        $user = Auth::getCurrentUser();
        
        if ($user) {
            self::logAction($user['id'], 'logout', 'Deconnexion');
            Logger::info('User logged out', ['user_id' => $user['id']]);
        }
        
        Response::success(null, 'Deconnexion reussie');
    }
    
    /**
     * GET /api/me - Obtenir l'utilisateur connecte
     */
    public static function me() {
        $user = Auth::requireAuth();
        
        // Recuperer les infos completes
        $fullUser = null;
        $pdo = get_db();
        if ($pdo) {
            $fullUser = db()->fetchOne(
                'SELECT id, nom, prenom, email, telephone, date_naissance, sexe, avatar_url, role, consent_data, created_at, last_login 
                 FROM users WHERE id = ?',
                [$user['id']]
            );
        }
        
        if (!$fullUser) {
            $fullUser = self::getUserFromFileById($user['id']);
        }
        
        if (!$fullUser) {
            Response::notFound('Utilisateur non trouve');
        }
        
        // Supprimer le hash du mot de passe
        unset($fullUser['password_hash']);
        
        // Recuperer les stats
        $stats = self::getUserStats($user['id']);
        
        Response::success([
            'user' => $fullUser,
            'stats' => $stats
        ]);
    }
    
    /**
     * POST /api/forgot-password - Demande de reinitialisation
     */
    public static function forgotPassword() {
        $data = getRequestBody();
        
        $validator = new Validator($data);
        $validator->required('email')->email('email')->validate();
        
        $email = strtolower(trim($data['email']));
        
        // On repond toujours succes pour ne pas reveler si l'email existe
        Logger::info('Password reset requested', ['email' => $email]);
        
        Response::success(null, 'Si cet email existe, un lien de reinitialisation a ete envoye');
    }
    
    /**
     * PUT /api/change-password - Changer le mot de passe
     */
    public static function changePassword() {
        $user = Auth::requireAuth();
        $data = getRequestBody();
        
        $validator = new Validator($data);
        $validator
            ->required('current_password', 'Le mot de passe actuel est requis')
            ->required('new_password', 'Le nouveau mot de passe est requis')
            ->minLength('new_password', 8, 'Le nouveau mot de passe doit contenir au moins 8 caracteres')
            ->validate();
        
        // Recuperer le mot de passe actuel
        $currentUser = null;
        $pdo = get_db();
        if ($pdo) {
            $currentUser = db()->fetchOne('SELECT password_hash FROM users WHERE id = ?', [$user['id']]);
        }
        
        if (!$currentUser) {
            $currentUser = self::getUserFromFileById($user['id']);
        }
        
        if (!$currentUser || !password_verify($data['current_password'], $currentUser['password_hash'])) {
            Response::error('Mot de passe actuel incorrect', 400);
        }
        
        // Mettre a jour le mot de passe
        $newHash = password_hash($data['new_password'], PASSWORD_BCRYPT, ['cost' => 12]);
        
        if ($pdo) {
            db()->update('users', ['password_hash' => $newHash, 'updated_at' => date('Y-m-d H:i:s')], 'id = ?', [$user['id']]);
        } else {
            self::updateUserInFile($user['id'], ['password_hash' => $newHash]);
        }
        
        self::logAction($user['id'], 'change_password', 'Mot de passe modifie');
        Logger::info('Password changed', ['user_id' => $user['id']]);
        
        Response::success(null, 'Mot de passe modifie avec succes');
    }
    
    // ============================================
    // Helpers
    // ============================================
    
    private static function emailExists($email) {
        $pdo = get_db();
        if ($pdo) {
            $result = db()->fetchOne('SELECT id FROM users WHERE email = ?', [$email]);
            if ($result) return true;
        }
        
        // Verifier dans le fichier
        $usersFile = __DIR__ . '/../../storage/data/users.json';
        if (file_exists($usersFile)) {
            $users = json_decode(file_get_contents($usersFile), true) ?: [];
            foreach ($users as $u) {
                if (strtolower($u['email']) === strtolower($email)) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    private static function getUserFromFile($email) {
        $usersFile = __DIR__ . '/../../storage/data/users.json';
        if (!file_exists($usersFile)) return null;
        
        $users = json_decode(file_get_contents($usersFile), true) ?: [];
        foreach ($users as $u) {
            if (strtolower($u['email']) === strtolower($email)) {
                return $u;
            }
        }
        return null;
    }
    
    private static function getUserFromFileById($id) {
        $usersFile = __DIR__ . '/../../storage/data/users.json';
        if (!file_exists($usersFile)) return null;
        
        $users = json_decode(file_get_contents($usersFile), true) ?: [];
        foreach ($users as $u) {
            if ($u['id'] == $id) {
                return $u;
            }
        }
        return null;
    }
    
    private static function updateUserInFile($id, $data) {
        $usersFile = __DIR__ . '/../../storage/data/users.json';
        if (!file_exists($usersFile)) return false;
        
        $users = json_decode(file_get_contents($usersFile), true) ?: [];
        foreach ($users as &$u) {
            if ($u['id'] == $id) {
                $u = array_merge($u, $data);
                break;
            }
        }
        
        file_put_contents($usersFile, json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        return true;
    }
    
    private static function getUserStats($userId) {
        $stats = [
            'total_analyses' => 0,
            'analyses_ce_mois' => 0,
            'derniere_analyse' => null
        ];
        
        $pdo = get_db();
        if ($pdo) {
            $result = db()->fetchOne(
                'SELECT COUNT(*) as total, 
                        SUM(CASE WHEN date_analyse >= DATE_FORMAT(NOW(), "%Y-%m-01") THEN 1 ELSE 0 END) as ce_mois,
                        MAX(date_analyse) as derniere
                 FROM analyses WHERE user_id = ?',
                [$userId]
            );
            if ($result) {
                $stats['total_analyses'] = (int)$result['total'];
                $stats['analyses_ce_mois'] = (int)$result['ce_mois'];
                $stats['derniere_analyse'] = $result['derniere'];
            }
        } else {
            // Fallback fichier
            $analysesFile = __DIR__ . '/../../storage/data/analyses.json';
            if (file_exists($analysesFile)) {
                $analyses = json_decode(file_get_contents($analysesFile), true) ?: [];
                $thisMonth = date('Y-m');
                foreach ($analyses as $a) {
                    if (isset($a['user_id']) && $a['user_id'] == $userId) {
                        $stats['total_analyses']++;
                        if (substr($a['date_analyse'] ?? '', 0, 7) === $thisMonth) {
                            $stats['analyses_ce_mois']++;
                        }
                        if (!$stats['derniere_analyse'] || ($a['date_analyse'] ?? '') > $stats['derniere_analyse']) {
                            $stats['derniere_analyse'] = $a['date_analyse'] ?? null;
                        }
                    }
                }
            }
        }
        
        return $stats;
    }
    
    private static function logAction($userId, $action, $description = null) {
        $pdo = get_db();
        if ($pdo) {
            db()->insert('logs', [
                'user_id' => $userId,
                'action' => $action,
                'description' => $description,
                'ip_address' => getClientIp(),
                'user_agent' => getUserAgent(),
                'created_at' => date('Y-m-d H:i:s')
            ]);
        }
    }
}

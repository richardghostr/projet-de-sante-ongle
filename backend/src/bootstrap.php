<?php
/**
 * UNGUEALHEALTH - Bootstrap & Configuration
 * Version: 2.0
 */

// Activer le reporting d'erreurs en dev
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Timezone
date_default_timezone_set('Europe/Paris');

// Charger les variables d'environnement depuis .env
function loadEnv($path) {
    if (!file_exists($path)) return;
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') === false) continue;
        list($name, $value) = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value, " \t\n\r\0\x0B\"'");
        if (!getenv($name)) {
            putenv("$name=$value");
            $_ENV[$name] = $value;
        }
    }
}

loadEnv(__DIR__ . '/../.env');

// Configuration globale
$config = [
    'app' => [
        'name' => 'UnguealHealth',
        'version' => '2.0.0',
        'env' => getenv('APP_ENV') ?: 'development',
        'debug' => getenv('APP_DEBUG') === 'true',
        'url' => getenv('APP_URL') ?: 'http://localhost:8000',
        'secret_key' => getenv('APP_SECRET') ?: 'unguealhealth_secret_key_change_in_production',
    ],
    'db' => [
        'host' => getenv('DB_HOST') ?: 'db',
        'port' => getenv('DB_PORT') ?: '3306',
        'database' => getenv('DB_NAME') ?: 'unguealhealth',
        'user' => getenv('DB_USER') ?: 'uh_user',
        'pass' => getenv('DB_PASS') ?: 'uh_pass',
        'charset' => 'utf8mb4',
    ],
    'ia' => [
        'url' => getenv('IA_SERVICE_URL') ?: 'http://ia:8001',
        'timeout' => (int)(getenv('IA_TIMEOUT') ?: 30),
    ],
    'uploads' => [
        'dir' => __DIR__ . '/../storage/uploads',
        'max_size' => 5 * 1024 * 1024, // 5MB per new spec
        'allowed_types' => ['image/jpeg', 'image/png'],
        'allowed_extensions' => ['jpg', 'jpeg', 'png'],
    ],
    'jwt' => [
        'secret' => getenv('JWT_SECRET') ?: 'jwt_secret_key_change_in_production',
        'expiry' => 86400 * 7, // 7 jours
        'algorithm' => 'HS256',
    ],
    'cors' => [
        'allowed_origins' => ['http://localhost:3000', 'http://localhost:8080', '*'],
        'allowed_methods' => ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        'allowed_headers' => ['Content-Type', 'Authorization', 'X-Requested-With'],
    ],
];

// Creer les dossiers necessaires
$dirs = [
    $config['uploads']['dir'],
    __DIR__ . '/../storage/thumbnails',
    __DIR__ . '/../storage/heatmaps',
    __DIR__ . '/../storage/logs',
    __DIR__ . '/../storage/data',
];

foreach ($dirs as $dir) {
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
}

// ============================================
// Classe Database - Singleton PDO
// ============================================
class Database {
    private static $instance = null;
    private $pdo = null;
    private $connected = false;

    private function __construct() {
        global $config;
        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=%s',
            $config['db']['host'],
            $config['db']['port'],
            $config['db']['database'],
            $config['db']['charset']
        );
        
        try {
            $this->pdo = new PDO($dsn, $config['db']['user'], $config['db']['pass'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
            ]);
            $this->connected = true;
        } catch (PDOException $e) {
            Logger::error('Database connection failed', ['error' => $e->getMessage()]);
            $this->pdo = null;
            $this->connected = false;
        }
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getConnection() {
        return $this->pdo;
    }

    public function isConnected() {
        return $this->connected;
    }

    public function query($sql, $params = []) {
        if (!$this->pdo) return false;
        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            return $stmt;
        } catch (PDOException $e) {
            Logger::error('Query failed', ['sql' => $sql, 'error' => $e->getMessage()]);
            return false;
        }
    }

    public function insert($table, $data) {
        $columns = implode(', ', array_keys($data));
        $placeholders = implode(', ', array_fill(0, count($data), '?'));
        $sql = "INSERT INTO $table ($columns) VALUES ($placeholders)";
        $stmt = $this->query($sql, array_values($data));
        return $stmt ? $this->pdo->lastInsertId() : false;
    }

    public function update($table, $data, $where, $whereParams = []) {
        $set = implode(' = ?, ', array_keys($data)) . ' = ?';
        $sql = "UPDATE $table SET $set WHERE $where";
        return $this->query($sql, array_merge(array_values($data), $whereParams));
    }

    public function delete($table, $where, $params = []) {
        $sql = "DELETE FROM $table WHERE $where";
        return $this->query($sql, $params);
    }

    public function fetchOne($sql, $params = []) {
        $stmt = $this->query($sql, $params);
        return $stmt ? $stmt->fetch() : null;
    }

    public function fetchAll($sql, $params = []) {
        $stmt = $this->query($sql, $params);
        return $stmt ? $stmt->fetchAll() : [];
    }
}

// Fonction helper pour acceder a la DB
function get_db() {
    return Database::getInstance()->getConnection();
}

function db() {
    return Database::getInstance();
}

// Ensure `professional_notes.read_at` exists (for older DBs)
try {
    $pdo = get_db();
    if ($pdo) {
        $schema = $GLOBALS['config']['db']['database'];
        $check = db()->fetchOne(
            'SELECT COUNT(*) as cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
            [$schema, 'professional_notes', 'read_at']
        );
        if ($check && intval($check['cnt']) === 0) {
            Logger::info('bootstrap: adding missing professional_notes.read_at column');
            db()->exec("ALTER TABLE professional_notes ADD COLUMN `read_at` TIMESTAMP NULL AFTER `updated_at`");
        }
    }
} catch (Exception $e) {
    // Non-fatal: log and continue
    Logger::warning('bootstrap: could not ensure professional_notes.read_at', ['error' => $e->getMessage()]);
}

// Ensure extended profile columns and professional_documents table exist
try {
    $pdo = get_db();
    if ($pdo) {
        $schema = $GLOBALS['config']['db']['database'];

        // Columns to ensure on `users`
        $cols = [
            'nationalite' => 'VARCHAR(100) NULL',
            'groupe_sanguin' => 'VARCHAR(10) NULL',
            'allergies' => 'TEXT NULL',
            'antecedents' => 'TEXT NULL',
            'traitement_en_cours' => 'TEXT NULL',
            'contact_urgence' => 'VARCHAR(255) NULL',
            'telephone_urgence' => 'VARCHAR(50) NULL',
            'profession' => 'VARCHAR(255) NULL',
            'adresse' => 'VARCHAR(512) NULL',
            'ville' => 'VARCHAR(255) NULL',
            'pays' => 'VARCHAR(255) NULL',

            // Professional specific
            'specialite' => 'VARCHAR(255) NULL',
            'sous_specialite' => 'VARCHAR(255) NULL',
            'matricule' => 'VARCHAR(100) NULL',
            'numero_ordre' => 'VARCHAR(100) NULL',
            'etablissement' => 'VARCHAR(255) NULL',
            'annees_experience' => 'INT NULL',
            'grade' => 'VARCHAR(255) NULL',
            'disponibilites_text' => 'TEXT NULL',
            'statut' => 'VARCHAR(50) NULL'
        ];

        foreach ($cols as $col => $definition) {
            $check = db()->fetchOne(
                'SELECT COUNT(*) as cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
                [$schema, 'users', $col]
            );
            if ($check && intval($check['cnt']) === 0) {
                Logger::info('bootstrap: adding missing users.' . $col);
                db()->query("ALTER TABLE users ADD COLUMN `$col` $definition AFTER updated_at");
            }
        }

        // Create professional_documents table if missing
        $tblCheck = db()->fetchOne(
            'SELECT COUNT(*) as cnt FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
            [$schema, 'professional_documents']
        );
        if (!$tblCheck || intval($tblCheck['cnt']) === 0) {
            Logger::info('bootstrap: creating professional_documents table');
            db()->query(
                "CREATE TABLE professional_documents (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    uuid VARCHAR(64) NOT NULL,
                    user_id INT NOT NULL,
                    filename VARCHAR(255) NOT NULL,
                    url VARCHAR(512) NOT NULL,
                    type VARCHAR(100) DEFAULT NULL,
                    verified TINYINT(1) DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NULL DEFAULT NULL,
                    INDEX(user_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
            );
        }
    }
} catch (Exception $e) {
    Logger::warning('bootstrap: could not ensure extended profile schema', ['error' => $e->getMessage()]);
}

// ============================================
// Classe Logger
// ============================================
class Logger {
    private static $logFile = null;

    private static function getLogFile() {
        if (self::$logFile === null) {
            self::$logFile = __DIR__ . '/../storage/logs/app_' . date('Y-m-d') . '.log';
        }
        return self::$logFile;
    }

    private static function write($level, $message, $context = []) {
        $timestamp = date('Y-m-d H:i:s');
        $contextStr = !empty($context) ? ' ' . json_encode($context, JSON_UNESCAPED_UNICODE) : '';
        $line = "[$timestamp] [$level] $message$contextStr\n";
        file_put_contents(self::getLogFile(), $line, FILE_APPEND | LOCK_EX);
    }

    public static function debug($message, $context = []) { self::write('DEBUG', $message, $context); }
    public static function info($message, $context = []) { self::write('INFO', $message, $context); }
    public static function warning($message, $context = []) { self::write('WARNING', $message, $context); }
    public static function error($message, $context = []) { self::write('ERROR', $message, $context); }
    public static function critical($message, $context = []) { self::write('CRITICAL', $message, $context); }
}

// ============================================
// Classe Response - Reponses JSON standardisees
// ============================================
class Response {
    public static function json($data, $statusCode = 200) {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }

    public static function success($data = null, $message = 'Success', $statusCode = 200) {
        self::json([
            'success' => true,
            'message' => $message,
            'data' => $data,
            'timestamp' => date('c')
        ], $statusCode);
    }

    public static function error($message, $statusCode = 400, $errors = null) {
        self::json([
            'success' => false,
            'message' => $message,
            'errors' => $errors,
            'timestamp' => date('c')
        ], $statusCode);
    }

    public static function created($data = null, $message = 'Created') {
        self::success($data, $message, 201);
    }

    public static function notFound($message = 'Resource not found') {
        self::error($message, 404);
    }

    public static function unauthorized($message = 'Unauthorized') {
        self::error($message, 401);
    }

    public static function forbidden($message = 'Forbidden') {
        self::error($message, 403);
    }

    public static function serverError($message = 'Internal server error') {
        self::error($message, 500);
    }
}

// ============================================
// Classe JWT - Gestion des tokens
// ============================================
class JWT {
    public static function encode($payload) {
        global $config;
        $header = json_encode(['typ' => 'JWT', 'alg' => $config['jwt']['algorithm']]);
        $payload['iat'] = time();
        $payload['exp'] = time() + $config['jwt']['expiry'];
        $payloadJson = json_encode($payload);
        
        $base64Header = self::base64UrlEncode($header);
        $base64Payload = self::base64UrlEncode($payloadJson);
        
        $signature = hash_hmac('sha256', "$base64Header.$base64Payload", $config['jwt']['secret'], true);
        $base64Signature = self::base64UrlEncode($signature);
        
        return "$base64Header.$base64Payload.$base64Signature";
    }

    public static function decode($token) {
        global $config;
        $parts = explode('.', $token);
        if (count($parts) !== 3) return null;
        
        list($base64Header, $base64Payload, $base64Signature) = $parts;
        
        $signature = self::base64UrlEncode(
            hash_hmac('sha256', "$base64Header.$base64Payload", $config['jwt']['secret'], true)
        );
        
        if (!hash_equals($signature, $base64Signature)) return null;
        
        $payload = json_decode(self::base64UrlDecode($base64Payload), true);
        
        if (isset($payload['exp']) && $payload['exp'] < time()) return null;
        
        return $payload;
    }

    private static function base64UrlEncode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64UrlDecode($data) {
        return base64_decode(strtr($data, '-_', '+/'));
    }
}

// ============================================
// Classe Auth - Authentification
// ============================================
class Auth {
    private static $currentUser = null;

    public static function getTokenFromHeader() {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        
        if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            return $matches[1];
        }
        return null;
    }

    public static function authenticate() {
        $token = self::getTokenFromHeader();
        if (!$token) return null;
        
        $payload = JWT::decode($token);
        if (!$payload || !isset($payload['user_id'])) return null;
        

        // Recuperer l'utilisateur en base sans filtrer sur status (we'll apply allowed-status logic)
        $user = db()->fetchOne(
            'SELECT id, nom, prenom, email, role, status FROM users WHERE id = ?',
            [$payload['user_id']]
        );

        if ($user) {
            // Block only deleted / suspended / inactive accounts
            if (isset($user['status']) && in_array($user['status'], ['deleted', 'suspended', 'inactive'])) {
                $user = null;
            }
        }

        if (!$user) {
            // Fallback fichier
            $user = self::getUserFromFile($payload['user_id']);
        }
        
        self::$currentUser = $user;
        return $user;
    }

    public static function getCurrentUser() {
        if (self::$currentUser === null) {
            self::authenticate();
        }
        return self::$currentUser;
    }

    public static function requireAuth() {
        $user = self::getCurrentUser();
        if (!$user) {
            Response::unauthorized('Authentication required');
        }
        return $user;
    }

    public static function requireRole($roles) {
        $user = self::requireAuth();
        $roles = is_array($roles) ? $roles : [$roles];
        if (!in_array($user['role'], $roles)) {
            Response::forbidden('Insufficient permissions');
        }
        return $user;
    }

    private static function getUserFromFile($userId) {
        $usersFile = __DIR__ . '/../storage/data/users.json';
        if (!file_exists($usersFile)) return null;
        $users = json_decode(file_get_contents($usersFile), true) ?: [];
        foreach ($users as $u) {
            $s = $u['status'] ?? 'active';
            if ($u['id'] == $userId && in_array($s, ['active', 'pending', 'approved'])) {
                return $u;
            }
        }
        return null;
    }
}

// ============================================
// Classe Validator - Validation des donnees
// ============================================
class Validator {
    private $errors = [];
    private $data = [];

    public function __construct($data) {
        $this->data = $data;
    }

    public function required($field, $message = null) {
        if (!isset($this->data[$field]) || trim($this->data[$field]) === '') {
            $this->errors[$field] = $message ?: "Le champ $field est requis";
        }
        return $this;
    }

    public function email($field, $message = null) {
        if (isset($this->data[$field]) && !filter_var($this->data[$field], FILTER_VALIDATE_EMAIL)) {
            $this->errors[$field] = $message ?: "L'email n'est pas valide";
        }
        return $this;
    }

    public function minLength($field, $min, $message = null) {
        if (isset($this->data[$field]) && strlen($this->data[$field]) < $min) {
            $this->errors[$field] = $message ?: "Le champ $field doit contenir au moins $min caracteres";
        }
        return $this;
    }

    public function maxLength($field, $max, $message = null) {
        if (isset($this->data[$field]) && strlen($this->data[$field]) > $max) {
            $this->errors[$field] = $message ?: "Le champ $field ne doit pas depasser $max caracteres";
        }
        return $this;
    }

    public function in($field, $values, $message = null) {
        if (isset($this->data[$field]) && !in_array($this->data[$field], $values)) {
            $this->errors[$field] = $message ?: "La valeur du champ $field n'est pas valide";
        }
        return $this;
    }

    public function isValid() {
        return empty($this->errors);
    }

    public function getErrors() {
        return $this->errors;
    }

    public function validate() {
        if (!$this->isValid()) {
            Response::error('Validation failed', 422, $this->errors);
        }
        return true;
    }
}

// ============================================
// Helper Functions
// ============================================
function getClientIp() {
    $headers = ['HTTP_CLIENT_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_FORWARDED', 'REMOTE_ADDR'];
    foreach ($headers as $header) {
        if (!empty($_SERVER[$header])) {
            $ip = explode(',', $_SERVER[$header])[0];
            if (filter_var($ip, FILTER_VALIDATE_IP)) {
                return $ip;
            }
        }
    }
    return '0.0.0.0';
}

function getUserAgent() {
    return $_SERVER['HTTP_USER_AGENT'] ?? '';
}

function generateUUID() {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

function sanitizeFilename($filename) {
    $filename = preg_replace('/[^a-zA-Z0-9_.-]/', '_', $filename);
    return substr($filename, 0, 200);
}

function getRequestBody() {
    $body = file_get_contents('php://input');
    return json_decode($body, true) ?: [];
}

// ============================================
// CORS Headers
// ============================================
function setCorsHeaders() {
    global $config;
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    // Normalize allowed origins
    $allowed = array_map('trim', $config['cors']['allowed_origins']);

    // If wildcard is allowed, echo wildcard but do not allow credentials with '*'
    if (in_array('*', $allowed)) {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: ' . implode(', ', $config['cors']['allowed_methods']));
        header('Access-Control-Allow-Headers: ' . implode(', ', $config['cors']['allowed_headers']));
        header('Access-Control-Max-Age: 86400');
    } else {
        // Only allow specific origins and enable credentials
        if ($origin && in_array($origin, $allowed)) {
            header("Access-Control-Allow-Origin: $origin");
            header('Vary: Origin');
            header('Access-Control-Allow-Methods: ' . implode(', ', $config['cors']['allowed_methods']));
            header('Access-Control-Allow-Headers: ' . implode(', ', $config['cors']['allowed_headers']));
            header('Access-Control-Allow-Credentials: true');
            header('Access-Control-Max-Age: 86400');
        }
    }
}

setCorsHeaders();

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

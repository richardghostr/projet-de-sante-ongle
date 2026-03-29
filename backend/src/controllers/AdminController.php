<?php
/**
 * UNGUEALHEALTH - Admin Controller
 * Gestion administrative (role: admin)
 */

require_once __DIR__ . '/../bootstrap.php';

class AdminController {
    
    /**
     * Dashboard admin - statistiques globales
     */
    public static function dashboard() {
        Auth::requireRole(['admin']);
        
        $stats = [
            'users' => ['total' => 0, 'active' => 0, 'by_role' => []],
            'analyses' => ['total' => 0, 'today' => 0, 'by_risk' => []],
            'treatments' => ['active' => 0, 'total' => 0],
            'feedback' => ['pending' => 0, 'total' => 0]
        ];
        
        $pdo = get_db();
        if ($pdo) {
            // Stats utilisateurs
            $result = db()->fetchOne('SELECT COUNT(*) as total FROM users');
            $stats['users']['total'] = (int)($result['total'] ?? 0);
            
            $result = db()->fetchOne('SELECT COUNT(*) as total FROM users WHERE status = "active"');
            $stats['users']['active'] = (int)($result['total'] ?? 0);
            
            $roles = db()->fetchAll('SELECT role, COUNT(*) as count FROM users GROUP BY role');
            foreach ($roles as $r) {
                $stats['users']['by_role'][$r['role']] = (int)$r['count'];
            }
            
            // Stats analyses
            $result = db()->fetchOne('SELECT COUNT(*) as total FROM analyses');
            $stats['analyses']['total'] = (int)($result['total'] ?? 0);
            
            $result = db()->fetchOne('SELECT COUNT(*) as total FROM analyses WHERE DATE(date_analyse) = CURDATE()');
            $stats['analyses']['today'] = (int)($result['total'] ?? 0);
            
            $risks = db()->fetchAll('SELECT niveau_risque, COUNT(*) as count FROM analyses GROUP BY niveau_risque');
            foreach ($risks as $r) {
                $stats['analyses']['by_risk'][$r['niveau_risque']] = (int)$r['count'];
            }
            
            // Stats traitements
            $result = db()->fetchOne('SELECT COUNT(*) as total FROM treatment_plans WHERE status = "active"');
            $stats['treatments']['active'] = (int)($result['total'] ?? 0);
            
            $result = db()->fetchOne('SELECT COUNT(*) as total FROM treatment_plans');
            $stats['treatments']['total'] = (int)($result['total'] ?? 0);
            
            // Stats feedback
            $result = db()->fetchOne('SELECT COUNT(*) as total FROM feedback WHERE status = "new"');
            $stats['feedback']['pending'] = (int)($result['total'] ?? 0);
            
            $result = db()->fetchOne('SELECT COUNT(*) as total FROM feedback');
            $stats['feedback']['total'] = (int)($result['total'] ?? 0);
        }
        
        Response::success($stats);
    }
    
    /**
     * Liste des utilisateurs avec filtres
     */
    public static function listUsers() {
        Auth::requireRole(['admin']);
        
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = min(100, max(1, (int)($_GET['limit'] ?? 20)));
        $offset = ($page - 1) * $limit;
        $role = $_GET['role'] ?? null;
        $status = $_GET['status'] ?? null;
        $search = $_GET['search'] ?? null;
        
        $where = '1=1';
        $params = [];
        
        if ($role && in_array($role, ['user', 'student', 'professional', 'admin'])) {
            $where .= ' AND role = ?';
            $params[] = $role;
        }
        
        if ($status && in_array($status, ['active', 'inactive', 'suspended', 'deleted', 'pending_verification'])) {
            $where .= ' AND status = ?';
            $params[] = $status;
        }
        
        if ($search) {
            $where .= ' AND (nom LIKE ? OR prenom LIKE ? OR email LIKE ?)';
            $searchTerm = '%' . $search . '%';
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        }
        
        $pdo = get_db();
        if (!$pdo) {
            Response::success(['users' => [], 'total' => 0, 'page' => $page, 'limit' => $limit]);
            return;
        }
        
        // Count total
        $countResult = db()->fetchOne("SELECT COUNT(*) as total FROM users WHERE $where", $params);
        $total = (int)($countResult['total'] ?? 0);
        
        // Get users
        $params[] = $limit;
        $params[] = $offset;
        $users = db()->fetchAll(
            "SELECT id, nom, prenom, email, role, status, avatar_url, telephone, 
                    specialite, etablissement, last_login, login_count, created_at 
             FROM users WHERE $where ORDER BY created_at DESC LIMIT ? OFFSET ?",
            $params
        );
        
        Response::success([
            'users' => $users,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'pages' => ceil($total / $limit)
        ]);
    }
    
    /**
     * Details d'un utilisateur
     */
    public static function getUser($userId) {
        Auth::requireRole(['admin']);
        
        $user = db()->fetchOne(
            'SELECT id, nom, prenom, email, role, status, avatar_url, telephone, 
                    date_naissance, sexe, specialite, numero_ordre, etablissement,
                    consent_data, consent_date, email_verified, email_verified_at,
                    last_login, login_count, preferences, created_at, updated_at 
             FROM users WHERE id = ?',
            [$userId]
        );
        
        if (!$user) {
            Response::notFound('Utilisateur non trouve');
        }
        
        // Get user stats
        $stats = db()->fetchOne(
            'SELECT COUNT(*) as total_analyses FROM analyses WHERE user_id = ?',
            [$userId]
        );
        $user['total_analyses'] = (int)($stats['total_analyses'] ?? 0);
        
        $stats = db()->fetchOne(
            'SELECT COUNT(*) as total_treatments FROM treatment_plans WHERE user_id = ?',
            [$userId]
        );
        $user['total_treatments'] = (int)($stats['total_treatments'] ?? 0);
        
        Response::success($user);
    }
    
    /**
     * Modifier le role d'un utilisateur
     */
    public static function updateUserRole($userId) {
        $admin = Auth::requireRole(['admin']);
        $data = getRequestBody();
        
        $validator = new Validator($data);
        $validator->required('role')
                  ->in('role', ['user', 'student', 'professional', 'admin']);
        $validator->validate();
        
        // Cannot change own role
        if ($userId == $admin['id']) {
            Response::error('Vous ne pouvez pas modifier votre propre role', 400);
        }
        
        $user = db()->fetchOne('SELECT id, role FROM users WHERE id = ?', [$userId]);
        if (!$user) {
            Response::notFound('Utilisateur non trouve');
        }
        
        db()->update('users', ['role' => $data['role']], 'id = ?', [$userId]);
        
        Logger::info('User role updated', [
            'admin_id' => $admin['id'],
            'user_id' => $userId,
            'old_role' => $user['role'],
            'new_role' => $data['role']
        ]);
        
        Response::success(['message' => 'Role mis a jour', 'role' => $data['role']]);
    }
    
    /**
     * Modifier le statut d'un utilisateur
     */
    public static function updateUserStatus($userId) {
        $admin = Auth::requireRole(['admin']);
        $data = getRequestBody();
        
        $validator = new Validator($data);
        $validator->required('status')
                  ->in('status', ['active', 'inactive', 'suspended', 'deleted']);
        $validator->validate();
        
        // Cannot change own status
        if ($userId == $admin['id']) {
            Response::error('Vous ne pouvez pas modifier votre propre statut', 400);
        }
        
        $user = db()->fetchOne('SELECT id, status FROM users WHERE id = ?', [$userId]);
        if (!$user) {
            Response::notFound('Utilisateur non trouve');
        }
        
        db()->update('users', ['status' => $data['status']], 'id = ?', [$userId]);
        
        Logger::info('User status updated', [
            'admin_id' => $admin['id'],
            'user_id' => $userId,
            'old_status' => $user['status'],
            'new_status' => $data['status']
        ]);
        
        Response::success(['message' => 'Statut mis a jour', 'status' => $data['status']]);
    }
    
    /**
     * Liste de toutes les analyses (admin view)
     */
    public static function listAnalyses() {
        Auth::requireRole(['admin']);
        
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = min(100, max(1, (int)($_GET['limit'] ?? 20)));
        $offset = ($page - 1) * $limit;
        $riskLevel = $_GET['risk'] ?? null;
        $status = $_GET['status'] ?? null;
        
        $where = '1=1';
        $params = [];
        
        if ($riskLevel && in_array($riskLevel, ['sain', 'bas', 'modere', 'eleve', 'critique'])) {
            $where .= ' AND a.niveau_risque = ?';
            $params[] = $riskLevel;
        }
        
        if ($status && in_array($status, ['pending', 'processing', 'completed', 'failed', 'archived'])) {
            $where .= ' AND a.status = ?';
            $params[] = $status;
        }
        
        $countResult = db()->fetchOne("SELECT COUNT(*) as total FROM analyses a WHERE $where", $params);
        $total = (int)($countResult['total'] ?? 0);
        
        $params[] = $limit;
        $params[] = $offset;
        $analyses = db()->fetchAll(
            "SELECT a.id, a.uuid, a.user_id, u.nom as user_nom, u.email as user_email,
                    a.pathologie_label, a.score_confiance, a.niveau_risque, a.status,
                    a.date_analyse, a.completed_at
             FROM analyses a
             LEFT JOIN users u ON a.user_id = u.id
             WHERE $where
             ORDER BY a.date_analyse DESC
             LIMIT ? OFFSET ?",
            $params
        );
        
        Response::success([
            'analyses' => $analyses,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'pages' => ceil($total / $limit)
        ]);
    }
    
    /**
     * Liste des feedbacks
     */
    public static function listFeedback() {
        Auth::requireRole(['admin']);
        
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = min(100, max(1, (int)($_GET['limit'] ?? 20)));
        $offset = ($page - 1) * $limit;
        $status = $_GET['status'] ?? null;
        
        $where = '1=1';
        $params = [];
        
        if ($status && in_array($status, ['new', 'reviewed', 'resolved', 'ignored'])) {
            $where .= ' AND f.status = ?';
            $params[] = $status;
        }
        
        $countResult = db()->fetchOne("SELECT COUNT(*) as total FROM feedback f WHERE $where", $params);
        $total = (int)($countResult['total'] ?? 0);
        
        $params[] = $limit;
        $params[] = $offset;
        $feedbacks = db()->fetchAll(
            "SELECT f.*, u.nom as user_nom, u.email as user_email
             FROM feedback f
             LEFT JOIN users u ON f.user_id = u.id
             WHERE $where
             ORDER BY f.created_at DESC
             LIMIT ? OFFSET ?",
            $params
        );
        
        Response::success([
            'feedbacks' => $feedbacks,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'pages' => ceil($total / $limit)
        ]);
    }
    
    /**
     * Mettre a jour le statut d'un feedback
     */
    public static function updateFeedback($feedbackId) {
        $admin = Auth::requireRole(['admin']);
        $data = getRequestBody();
        
        $feedback = db()->fetchOne('SELECT id FROM feedback WHERE id = ?', [$feedbackId]);
        if (!$feedback) {
            Response::notFound('Feedback non trouve');
        }
        
        $updateData = [];
        if (isset($data['status']) && in_array($data['status'], ['new', 'reviewed', 'resolved', 'ignored'])) {
            $updateData['status'] = $data['status'];
            if ($data['status'] !== 'new') {
                $updateData['reviewed_at'] = date('Y-m-d H:i:s');
            }
        }
        if (isset($data['admin_notes'])) {
            $updateData['admin_notes'] = $data['admin_notes'];
        }
        
        if (!empty($updateData)) {
            db()->update('feedback', $updateData, 'id = ?', [$feedbackId]);
        }
        
        Response::success(['message' => 'Feedback mis a jour']);
    }
    
    /**
     * Logs systeme
     */
    public static function getLogs() {
        Auth::requireRole(['admin']);
        
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = min(100, max(1, (int)($_GET['limit'] ?? 50)));
        $offset = ($page - 1) * $limit;
        $severity = $_GET['severity'] ?? null;
        $action = $_GET['action'] ?? null;
        
        $where = '1=1';
        $params = [];
        
        if ($severity && in_array($severity, ['debug', 'info', 'warning', 'error', 'critical'])) {
            $where .= ' AND l.severity = ?';
            $params[] = $severity;
        }
        
        if ($action) {
            $where .= ' AND l.action LIKE ?';
            $params[] = '%' . $action . '%';
        }
        
        $countResult = db()->fetchOne("SELECT COUNT(*) as total FROM logs l WHERE $where", $params);
        $total = (int)($countResult['total'] ?? 0);
        
        $params[] = $limit;
        $params[] = $offset;
        $logs = db()->fetchAll(
            "SELECT l.*, u.nom as user_nom
             FROM logs l
             LEFT JOIN users u ON l.user_id = u.id
             WHERE $where
             ORDER BY l.created_at DESC
             LIMIT ? OFFSET ?",
            $params
        );
        
        Response::success([
            'logs' => $logs,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'pages' => ceil($total / $limit)
        ]);
    }
    
    /**
     * Verifier un compte professionnel
     */
    public static function verifyProfessional($userId) {
        $admin = Auth::requireRole(['admin']);
        $data = getRequestBody();
        
        $user = db()->fetchOne(
            'SELECT id, role, status FROM users WHERE id = ? AND role IN ("professional", "student")',
            [$userId]
        );
        
        if (!$user) {
            Response::notFound('Utilisateur professionnel non trouve');
        }
        
        $verified = $data['verified'] ?? true;
        $newStatus = $verified ? 'active' : 'pending_verification';
        
        db()->update('users', [
            'status' => $newStatus,
            'email_verified' => $verified ? 1 : 0,
            'email_verified_at' => $verified ? date('Y-m-d H:i:s') : null
        ], 'id = ?', [$userId]);
        
        Logger::info('Professional verified', [
            'admin_id' => $admin['id'],
            'user_id' => $userId,
            'verified' => $verified
        ]);
        
        Response::success(['message' => $verified ? 'Professionnel verifie' : 'Verification annulee']);
    }
}

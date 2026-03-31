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
        
        if ($status && in_array($status, ['active', 'inactive', 'suspended', 'deleted', 'pending', 'approved', 'pending_verification'])) {
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
              ->in('status', ['active', 'inactive', 'suspended', 'deleted', 'pending', 'approved']);
          $validator->validate();
        
        // Cannot change own status
        if ($userId == $admin['id']) {
            Response::error('Vous ne pouvez pas modifier votre propre statut', 400);
        }
        
        $user = db()->fetchOne('SELECT id, status FROM users WHERE id = ?', [$userId]);
        if (!$user) {
            Response::notFound('Utilisateur non trouve');
        }
        
        // Some deployments may not have 'approved' in users.status enum.
        // Map 'approved' to 'active' when writing to users.status to avoid enum truncation.
        $statusToWrite = ($data['status'] === 'approved') ? 'active' : $data['status'];
        db()->update('users', ['status' => $statusToWrite], 'id = ?', [$userId]);

        // If approving/rejecting a professional, sync professional_profiles.statut_validation
        if (in_array($data['status'], ['approved', 'pending'])) {
            $roleRow = db()->fetchOne('SELECT role FROM users WHERE id = ?', [$userId]);
            if ($roleRow && ($roleRow['role'] ?? '') === 'professional') {
                // Ensure professional_profiles row exists
                $pp = db()->fetchOne('SELECT id FROM professional_profiles WHERE user_id = ?', [$userId]);
                if ($pp) {
                    db()->update('professional_profiles', ['statut_validation' => $data['status']], 'user_id = ?', [$userId]);
                } else {
                    // create minimal profile if missing
                    db()->insert('professional_profiles', ['user_id' => $userId, 'statut_validation' => $data['status'], 'created_at' => date('Y-m-d H:i:s')]);
                }
            }
        }
        
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
        
        $verified = isset($data['verified']) ? (bool)$data['verified'] : true;
        // If admin tries to approve the professional, ensure all their documents are approved first
        if ($verified) {
            // fetch documents for the user
            $docs = db()->fetchAll('SELECT id, statut_validation FROM professional_documents WHERE user_id = ?', [$userId]);
            $allApproved = true;
            if (empty($docs)) {
                $allApproved = false;
            } else {
                foreach ($docs as $d) {
                    if (($d['statut_validation'] ?? '') !== 'approved') { $allApproved = false; break; }
                }
            }

            if (!$allApproved) {
                // Instruct admin to validate all documents first and provide redirect URL
                $redirect = '/admin/validate-professionals?userId=' . urlencode($userId);
                Logger::info('Attempted to verify professional but documents pending', ['admin_id' => $admin['id'], 'user_id' => $userId]);
                Response::error('Tous les documents du professionnel doivent etre approuves avant de valider le profil. Veuillez valider les documents d abord.', 409, ['redirect' => $redirect]);
            }

            // All documents approved -> proceed to approve user
            db()->update('users', [
                'status' => 'approved',
                'email_verified' => 1,
                'email_verified_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ], 'id = ?', [$userId]);

            // Sync professional_profiles validation status
            $pp = db()->fetchOne('SELECT id FROM professional_profiles WHERE user_id = ?', [$userId]);
            if ($pp) {
                db()->update('professional_profiles', ['statut_validation' => 'approved', 'updated_at' => date('Y-m-d H:i:s')], 'user_id = ?', [$userId]);
            } else {
                db()->insert('professional_profiles', ['user_id' => $userId, 'statut_validation' => 'approved', 'created_at' => date('Y-m-d H:i:s')]);
            }

            // Notify the professional user that their account has been approved
            db()->insert('notifications', [
                'user_id' => $userId,
                'type' => 'success',
                'titre' => 'Compte professionnel approuve',
                'message' => 'Votre compte professionnel a ete approuve par un administrateur. Bienvenue!',
                'link' => '/professional/profile'
            ]);

            Logger::info('Professional fully verified', [
                'admin_id' => $admin['id'],
                'user_id' => $userId,
                'verified' => true
            ]);

            Response::success(['message' => 'Professionnel verifie et profil active']);
        } else {
            // un-verify -> set pending
            db()->update('users', [
                'status' => 'pending',
                'email_verified' => 0,
                'email_verified_at' => null,
                'updated_at' => date('Y-m-d H:i:s')
            ], 'id = ?', [$userId]);
            $pp = db()->fetchOne('SELECT id FROM professional_profiles WHERE user_id = ?', [$userId]);
            if ($pp) {
                db()->update('professional_profiles', ['statut_validation' => 'pending', 'updated_at' => date('Y-m-d H:i:s')], 'user_id = ?', [$userId]);
            } else {
                db()->insert('professional_profiles', ['user_id' => $userId, 'statut_validation' => 'pending', 'created_at' => date('Y-m-d H:i:s')]);
            }
            Logger::info('Professional verification revoked', ['admin_id' => $admin['id'], 'user_id' => $userId]);
            Response::success(['message' => 'Verification annulee']);
        }
    }

    /**
     * GET /api/admin/professionals/pending - liste des professionnels en attente avec documents
     */
    public static function listProfessionalsPendingValidation() {
        Auth::requireRole(['admin']);

        $pdo = get_db();
        if (!$pdo) {
            Response::success(['professionals' => []]);
            return;
        }

        // Select professionals with status pending or role professional with professional_profiles.statut_validation = 'pending'
        $professionals = db()->fetchAll(
            'SELECT u.id, u.nom, u.prenom, u.email, u.specialite, u.created_at, u.status, pp.statut_validation
             FROM users u
             LEFT JOIN professional_profiles pp ON pp.user_id = u.id
             WHERE u.role = "professional" AND (u.status = "pending" OR pp.statut_validation = "pending")
             ORDER BY u.created_at DESC'
        );

        // Attach documents for each professional
        foreach ($professionals as &$p) {
            $docs = db()->fetchAll('SELECT id, uuid, filename, url, type, type_document, statut_validation, commentaire_admin, date_validation, created_at FROM professional_documents WHERE user_id = ? ORDER BY created_at DESC', [$p['id']]);
            $p['documents'] = $docs;
        }

        Response::success(['professionals' => $professionals]);
    }
}

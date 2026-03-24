<?php
/**
 * UNGUEALHEALTH - ProfileController
 * Gestion du profil utilisateur
 */

class ProfileController {
    
    /**
     * GET /api/profile - Obtenir le profil complet
     */
    public static function get() {
        $user = Auth::requireAuth();
        
        $profile = null;
        $pdo = get_db();
        
        if ($pdo) {
            $profile = db()->fetchOne(
                'SELECT id, nom, prenom, email, telephone, date_naissance, sexe, 
                        avatar_url, role, consent_data, consent_date, preferences,
                        created_at, updated_at, last_login, login_count
                 FROM users WHERE id = ?',
                [$user['id']]
            );
        }
        
        if (!$profile) {
            $profile = self::getUserFromFile($user['id']);
        }
        
        if (!$profile) {
            Response::notFound('Profil non trouve');
        }
        
        // Ne pas envoyer le hash du mot de passe
        unset($profile['password_hash']);
        
        // Decoder les preferences JSON
        if (isset($profile['preferences']) && is_string($profile['preferences'])) {
            $profile['preferences'] = json_decode($profile['preferences'], true) ?: [];
        }
        
        // Calculer les statistiques
        $stats = self::getUserStats($user['id']);
        
        Response::success([
            'profile' => $profile,
            'stats' => $stats
        ]);
    }
    
    /**
     * PUT /api/profile - Mettre a jour le profil
     */
    public static function update() {
        $user = Auth::requireAuth();
        $data = getRequestBody();
        
        // Champs modifiables
        $allowedFields = ['nom', 'prenom', 'telephone', 'date_naissance', 'sexe', 'preferences'];
        $updateData = [];
        
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                if ($field === 'preferences') {
                    $updateData[$field] = json_encode($data[$field]);
                } elseif ($field === 'sexe') {
                    if (in_array($data[$field], ['homme', 'femme', 'autre', null])) {
                        $updateData[$field] = $data[$field];
                    }
                } elseif ($field === 'date_naissance') {
                    // Valider le format de date
                    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $data[$field])) {
                        $updateData[$field] = $data[$field];
                    }
                } else {
                    $updateData[$field] = trim($data[$field]);
                }
            }
        }
        
        if (empty($updateData)) {
            Response::error('Aucune donnee a mettre a jour', 400);
        }
        
        // Validation
        if (isset($updateData['nom']) && strlen($updateData['nom']) > 150) {
            Response::error('Le nom ne doit pas depasser 150 caracteres', 422);
        }
        if (isset($updateData['prenom']) && strlen($updateData['prenom']) > 150) {
            Response::error('Le prenom ne doit pas depasser 150 caracteres', 422);
        }
        if (isset($updateData['telephone']) && strlen($updateData['telephone']) > 20) {
            Response::error('Le telephone ne doit pas depasser 20 caracteres', 422);
        }
        
        $updateData['updated_at'] = date('Y-m-d H:i:s');
        
        $pdo = get_db();
        if ($pdo) {
            $result = db()->update('users', $updateData, 'id = ?', [$user['id']]);
            if (!$result) {
                Response::serverError('Erreur lors de la mise a jour');
            }
        } else {
            // Fallback fichier
            self::updateUserInFile($user['id'], $updateData);
        }
        
        Logger::info('Profile updated', ['user_id' => $user['id'], 'fields' => array_keys($updateData)]);
        
        // Retourner le profil mis a jour
        self::get();
    }
    
    /**
     * PUT /api/profile/email - Changer l'email
     */
    public static function updateEmail() {
        $user = Auth::requireAuth();
        $data = getRequestBody();
        
        $validator = new Validator($data);
        $validator
            ->required('email', 'Le nouvel email est requis')
            ->required('password', 'Le mot de passe est requis pour confirmer')
            ->email('email', 'L\'email n\'est pas valide')
            ->validate();
        
        $newEmail = strtolower(trim($data['email']));
        
        // Verifier que l'email n'est pas deja utilise
        $pdo = get_db();
        if ($pdo) {
            $existing = db()->fetchOne('SELECT id FROM users WHERE email = ? AND id != ?', [$newEmail, $user['id']]);
            if ($existing) {
                Response::error('Cet email est deja utilise', 409);
            }
            
            // Verifier le mot de passe
            $currentUser = db()->fetchOne('SELECT password_hash FROM users WHERE id = ?', [$user['id']]);
            if (!$currentUser || !password_verify($data['password'], $currentUser['password_hash'])) {
                Response::error('Mot de passe incorrect', 401);
            }
            
            // Mettre a jour l'email
            db()->update('users', [
                'email' => $newEmail,
                'email_verified' => 0,
                'email_verified_at' => null,
                'updated_at' => date('Y-m-d H:i:s')
            ], 'id = ?', [$user['id']]);
            
        } else {
            // Fallback fichier
            $usersFile = __DIR__ . '/../../storage/data/users.json';
            if (file_exists($usersFile)) {
                $users = json_decode(file_get_contents($usersFile), true) ?: [];
                
                // Verifier si email existe
                foreach ($users as $u) {
                    if (strtolower($u['email']) === $newEmail && $u['id'] != $user['id']) {
                        Response::error('Cet email est deja utilise', 409);
                    }
                }
                
                // Verifier mot de passe et mettre a jour
                foreach ($users as &$u) {
                    if ($u['id'] == $user['id']) {
                        if (!password_verify($data['password'], $u['password_hash'])) {
                            Response::error('Mot de passe incorrect', 401);
                        }
                        $u['email'] = $newEmail;
                        $u['updated_at'] = date('Y-m-d H:i:s');
                        break;
                    }
                }
                
                file_put_contents($usersFile, json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            }
        }
        
        Logger::info('Email updated', ['user_id' => $user['id'], 'new_email' => $newEmail]);
        
        Response::success(['email' => $newEmail], 'Email mis a jour avec succes');
    }
    
    /**
     * PUT /api/profile/consent - Mettre a jour le consentement
     */
    public static function updateConsent() {
        $user = Auth::requireAuth();
        $data = getRequestBody();
        
        if (!isset($data['consent_data'])) {
            Response::error('consent_data est requis', 400);
        }
        
        $consent = (int)$data['consent_data'];
        $consentDate = $consent ? date('Y-m-d H:i:s') : null;
        
        $pdo = get_db();
        if ($pdo) {
            db()->update('users', [
                'consent_data' => $consent,
                'consent_date' => $consentDate,
                'updated_at' => date('Y-m-d H:i:s')
            ], 'id = ?', [$user['id']]);
        } else {
            self::updateUserInFile($user['id'], [
                'consent_data' => $consent,
                'consent_date' => $consentDate
            ]);
        }
        
        Logger::info('Consent updated', ['user_id' => $user['id'], 'consent' => $consent]);
        
        Response::success([
            'consent_data' => $consent,
            'consent_date' => $consentDate
        ], 'Consentement mis a jour');
    }
    
    /**
     * POST /api/profile/avatar - Upload d'avatar
     */
    public static function uploadAvatar() {
        global $config;
        $user = Auth::requireAuth();
        
        if (!isset($_FILES['avatar']) || $_FILES['avatar']['error'] === UPLOAD_ERR_NO_FILE) {
            Response::error('Aucun fichier fourni', 400);
        }
        
        $file = $_FILES['avatar'];
        
        if ($file['error'] !== UPLOAD_ERR_OK) {
            Response::error('Erreur lors du telechargement', 400);
        }
        
        // Limiter a 2MB pour les avatars
        if ($file['size'] > 2 * 1024 * 1024) {
            Response::error('Fichier trop volumineux (max 2MB)', 413);
        }
        
        // Verifier le type
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
        
        if (!in_array($mimeType, ['image/jpeg', 'image/png', 'image/webp'])) {
            Response::error('Type de fichier non autorise', 400);
        }
        
        // Creer le dossier avatars
        $avatarDir = __DIR__ . '/../../storage/avatars';
        if (!is_dir($avatarDir)) {
            mkdir($avatarDir, 0755, true);
        }
        
        // Supprimer l'ancien avatar
        $pdo = get_db();
        if ($pdo) {
            $currentUser = db()->fetchOne('SELECT avatar_url FROM users WHERE id = ?', [$user['id']]);
            if ($currentUser && !empty($currentUser['avatar_url'])) {
                $oldPath = __DIR__ . '/../..' . $currentUser['avatar_url'];
                if (file_exists($oldPath)) {
                    unlink($oldPath);
                }
            }
        }
        
        // Generer le nouveau nom
        $extension = match($mimeType) {
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            default => 'jpg'
        };
        $filename = "avatar_{$user['id']}_" . time() . ".$extension";
        $destPath = $avatarDir . '/' . $filename;
        
        // Redimensionner l'image (200x200)
        $source = match($mimeType) {
            'image/jpeg' => imagecreatefromjpeg($file['tmp_name']),
            'image/png' => imagecreatefrompng($file['tmp_name']),
            'image/webp' => imagecreatefromwebp($file['tmp_name']),
            default => null
        };
        
        if ($source) {
            $width = imagesx($source);
            $height = imagesy($source);
            $size = min($width, $height);
            $x = ($width - $size) / 2;
            $y = ($height - $size) / 2;
            
            $avatar = imagecreatetruecolor(200, 200);
            imagecopyresampled($avatar, $source, 0, 0, (int)$x, (int)$y, 200, 200, $size, $size);
            imagejpeg($avatar, $destPath, 90);
            
            imagedestroy($source);
            imagedestroy($avatar);
        } else {
            move_uploaded_file($file['tmp_name'], $destPath);
        }
        
        $avatarUrl = '/storage/avatars/' . $filename;
        
        // Mettre a jour en base
        if ($pdo) {
            db()->update('users', [
                'avatar_url' => $avatarUrl,
                'updated_at' => date('Y-m-d H:i:s')
            ], 'id = ?', [$user['id']]);
        } else {
            self::updateUserInFile($user['id'], ['avatar_url' => $avatarUrl]);
        }
        
        Logger::info('Avatar updated', ['user_id' => $user['id']]);
        
        Response::success(['avatar_url' => $avatarUrl], 'Avatar mis a jour');
    }
    
    /**
     * DELETE /api/profile - Supprimer le compte
     */
    public static function delete() {
        $user = Auth::requireAuth();
        $data = getRequestBody();
        
        // Verification du mot de passe
        if (!isset($data['password'])) {
            Response::error('Le mot de passe est requis pour confirmer la suppression', 400);
        }
        
        $pdo = get_db();
        if ($pdo) {
            $currentUser = db()->fetchOne('SELECT password_hash FROM users WHERE id = ?', [$user['id']]);
            if (!$currentUser || !password_verify($data['password'], $currentUser['password_hash'])) {
                Response::error('Mot de passe incorrect', 401);
            }
            
            // Marquer comme supprime (soft delete)
            db()->update('users', [
                'status' => 'deleted',
                'email' => 'deleted_' . time() . '_' . $user['email'],
                'updated_at' => date('Y-m-d H:i:s')
            ], 'id = ?', [$user['id']]);
            
        } else {
            // Fallback fichier - verification et suppression
            $usersFile = __DIR__ . '/../../storage/data/users.json';
            if (file_exists($usersFile)) {
                $users = json_decode(file_get_contents($usersFile), true) ?: [];
                $found = false;
                
                foreach ($users as &$u) {
                    if ($u['id'] == $user['id']) {
                        if (!password_verify($data['password'], $u['password_hash'])) {
                            Response::error('Mot de passe incorrect', 401);
                        }
                        $u['status'] = 'deleted';
                        $u['email'] = 'deleted_' . time() . '_' . $u['email'];
                        $found = true;
                        break;
                    }
                }
                
                if ($found) {
                    file_put_contents($usersFile, json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
                }
            }
        }
        
        Logger::info('Account deleted', ['user_id' => $user['id']]);
        
        Response::success(null, 'Compte supprime avec succes');
    }
    
    // ============================================
    // Private Helpers
    // ============================================
    
    private static function getUserFromFile($userId) {
        $usersFile = __DIR__ . '/../../storage/data/users.json';
        if (!file_exists($usersFile)) return null;
        
        $users = json_decode(file_get_contents($usersFile), true) ?: [];
        foreach ($users as $u) {
            if ($u['id'] == $userId) {
                return $u;
            }
        }
        return null;
    }
    
    private static function updateUserInFile($userId, $data) {
        $usersFile = __DIR__ . '/../../storage/data/users.json';
        if (!file_exists($usersFile)) return false;
        
        $users = json_decode(file_get_contents($usersFile), true) ?: [];
        foreach ($users as &$u) {
            if ($u['id'] == $userId) {
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
            'analyses_sain' => 0,
            'analyses_a_risque' => 0,
            'derniere_analyse' => null,
            'membre_depuis' => null
        ];
        
        $pdo = get_db();
        
        if ($pdo) {
            // Stats analyses
            $result = db()->fetchOne(
                'SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN date_analyse >= DATE_FORMAT(NOW(), "%Y-%m-01") THEN 1 ELSE 0 END) as ce_mois,
                    SUM(CASE WHEN niveau_risque = "sain" THEN 1 ELSE 0 END) as sain,
                    SUM(CASE WHEN niveau_risque IN ("eleve", "critique") THEN 1 ELSE 0 END) as risque,
                    MAX(date_analyse) as derniere
                 FROM analyses WHERE user_id = ?',
                [$userId]
            );
            
            if ($result) {
                $stats['total_analyses'] = (int)$result['total'];
                $stats['analyses_ce_mois'] = (int)$result['ce_mois'];
                $stats['analyses_sain'] = (int)$result['sain'];
                $stats['analyses_a_risque'] = (int)$result['risque'];
                $stats['derniere_analyse'] = $result['derniere'];
            }
            
            // Date d'inscription
            $userResult = db()->fetchOne('SELECT created_at FROM users WHERE id = ?', [$userId]);
            $stats['membre_depuis'] = $userResult['created_at'] ?? null;
            
        } else {
            // Fallback fichier
            $analysesFile = __DIR__ . '/../../storage/data/analyses.json';
            if (file_exists($analysesFile)) {
                $analyses = json_decode(file_get_contents($analysesFile), true) ?: [];
                $thisMonth = date('Y-m');
                
                foreach ($analyses as $a) {
                    if (($a['user_id'] ?? null) == $userId) {
                        $stats['total_analyses']++;
                        if (substr($a['date_analyse'] ?? '', 0, 7) === $thisMonth) {
                            $stats['analyses_ce_mois']++;
                        }
                        if (($a['niveau_risque'] ?? '') === 'sain') {
                            $stats['analyses_sain']++;
                        }
                        if (in_array($a['niveau_risque'] ?? '', ['eleve', 'critique'])) {
                            $stats['analyses_a_risque']++;
                        }
                        if (!$stats['derniere_analyse'] || ($a['date_analyse'] ?? '') > $stats['derniere_analyse']) {
                            $stats['derniere_analyse'] = $a['date_analyse'] ?? null;
                        }
                    }
                }
            }
            
            // Date inscription depuis fichier users
            $user = self::getUserFromFile($userId);
            $stats['membre_depuis'] = $user['created_at'] ?? null;
        }
        
        return $stats;
    }
}

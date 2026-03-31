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
                        avatar_url, role, status, consent_data, consent_date, preferences,
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

        // Enrich with patient_profiles and professional_profiles when available
        if ($pdo) {
            // patient profile
            $patient = db()->fetchOne('SELECT * FROM patient_profiles WHERE user_id = ?', [$user['id']]);
            if ($patient) {
                // merge some commonly used fields into top-level for backward compatibility
                $mergeFields = ['date_naissance','sexe','groupe_sanguin','allergies','antecedents_medicaux','traitement_en_cours','contact_urgence','telephone','adresse','ville','pays','photo_profil'];
                foreach ($mergeFields as $f) {
                    if (isset($patient[$f])) $profile[$f] = $patient[$f];
                }
                $profile['patient'] = $patient;
            }

            // professional profile
            $professional = db()->fetchOne('SELECT * FROM professional_profiles WHERE user_id = ?', [$user['id']]);
            if ($professional) {
                $profile['professional'] = $professional;
            }
        } else {
            // fallback: read from storage files if present
            $ppfile = __DIR__ . '/../../storage/data/patient_profile_' . $user['id'] . '.json';
            if (file_exists($ppfile)) {
                $patient = json_decode(file_get_contents($ppfile), true) ?: null;
                if ($patient) {
                    foreach (['date_naissance','sexe','groupe_sanguin','allergies','antecedents_medicaux','traitement_en_cours','contact_urgence','telephone','adresse','ville','pays','photo_profil'] as $f) {
                        if (isset($patient[$f])) $profile[$f] = $patient[$f];
                    }
                    $profile['patient'] = $patient;
                }
            }
            $prfile = __DIR__ . '/../../storage/data/professional_profile_' . $user['id'] . '.json';
            if (file_exists($prfile)) {
                $professional = json_decode(file_get_contents($prfile), true) ?: null;
                if ($professional) $profile['professional'] = $professional;
            }
        }

        // Compute a canonical boolean for whether the professional account is validated.
        // This helps clients avoid discrepancies by relying on a single server-side source of truth.
        $isValidated = false;
        // check users.status and professional_profiles.statut_validation when available
        if (isset($profile['status']) && in_array(strtolower($profile['status']), ['approved', 'active', 'validated', 'valide', 'validé'])) {
            $isValidated = true;
        }
        if (isset($profile['professional']) && isset($profile['professional']['statut_validation']) && in_array(strtolower($profile['professional']['statut_validation']), ['approved', 'active', 'validated', 'valide', 'validé'])) {
            $isValidated = true;
        }
        $profile['is_professional_validated'] = $isValidated;
        
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
        
        // Fetch current status to enforce professional validation workflow
        $pdo = get_db();
        $currentStatus = null;
        if ($pdo) {
            $row = db()->fetchOne('SELECT status FROM users WHERE id = ?', [$user['id']]);
            $currentStatus = $row['status'] ?? null;
        } else {
            $uf = self::getUserFromFileById($user['id']);
            $currentStatus = $uf['status'] ?? null;
        }
        
        // Champs modifiables (ajout de champs cliniques pour patient et professionnel)
        $allowedFields = [
            'nom', 'prenom', 'telephone', 'date_naissance', 'sexe', 'preferences', 'nationalite',
            // patient medical
            'groupe_sanguin', 'allergies', 'antecedents', 'traitement_en_cours', 'contact_urgence', 'telephone_urgence', 'profession', 'adresse', 'ville', 'pays',
            // professional
            'specialite', 'sous_specialite', 'matricule', 'numero_ordre', 'etablissement', 'annees_experience', 'grade', 'disponibilites_text', 'statut', 'email_pro', 'telephone_pro', 'adresse_pro'
        ];
        
        // If user is a professional and not yet approved, block modification of professional fields
        if (($user['role'] ?? '') === 'professional' && $currentStatus !== 'approved') {
            $professionalFields = ['specialite', 'sous_specialite', 'matricule', 'numero_ordre', 'etablissement', 'annees_experience', 'grade', 'disponibilites_text', 'statut', 'email_pro', 'telephone_pro', 'adresse_pro'];
            foreach ($professionalFields as $f) {
                if (isset($data[$f])) {
                    Response::forbidden('Votre compte professionnel doit etre valide par un administrateur avant de completer le profil');
                }
            }
        }
        $updateData = [];
        
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                if ($field === 'preferences') {
                    $updateData[$field] = json_encode($data[$field]);
                } elseif ($field === 'allergies' && is_array($data[$field])) {
                    // Store allergies as JSON array when provided as an array
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
                        // If value is array, encode as JSON instead of trimming
                        if (is_array($data[$field])) {
                            $updateData[$field] = json_encode($data[$field]);
                        } else {
                            $val = trim($data[$field]);
                            // Do not allow empty 'nom' to overwrite an existing name
                            if ($field === 'nom') {
                                if ($val === '') {
                                    Response::error('Le nom est requis', 422);
                                }
                                $updateData[$field] = $val;
                            } elseif ($field === 'prenom') {
                                // empty prenom should be stored as NULL rather than empty string
                                $updateData[$field] = ($val === '' ? null : $val);
                            } else {
                                $updateData[$field] = $val;
                            }
                        }
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
        
        $updateTime = date('Y-m-d H:i:s');
        
        // Split update data between users, patient_profiles and professional_profiles
        $userFields = ['nom','prenom','telephone','date_naissance','sexe','preferences','nationalite','avatar_url','email'];
        $patientFields = ['groupe_sanguin','allergies','antecedents','traitement_en_cours','contact_urgence','telephone_urgence','adresse','ville','pays'];
        $professionalFields = ['specialite','sous_specialite','matricule','numero_ordre','etablissement','annees_experience','grade','disponibilites_text','statut','email_pro','telephone_pro','adresse_pro','biographie','photo_profil'];

        $userUpdate = [];
        $patientUpdate = [];
        $professionalUpdate = [];
        foreach ($updateData as $k => $v) {
            if (in_array($k, $userFields)) $userUpdate[$k] = $v;
            if (in_array($k, $patientFields)) $patientUpdate[$k] = $v;
            if (in_array($k, $professionalFields)) $professionalUpdate[$k] = $v;
        }

        $pdo = get_db();
        if ($pdo) {
            if (!empty($userUpdate)) {
                $userUpdate['updated_at'] = $updateTime;
                $res = db()->update('users', $userUpdate, 'id = ?', [$user['id']]);
                if (!$res) Response::serverError('Erreur lors de la mise a jour du compte');
            }

            // patient profile
            if (!empty($patientUpdate)) {
                // map frontend field names to DB columns
                if (isset($patientUpdate['antecedents'])) {
                    $patientUpdate['antecedents_medicaux'] = $patientUpdate['antecedents'];
                    unset($patientUpdate['antecedents']);
                }
                $patientUpdate['updated_at'] = $updateTime;
                $exists = db()->fetchOne('SELECT id FROM patient_profiles WHERE user_id = ?', [$user['id']]);
                if ($exists) {
                    db()->update('patient_profiles', $patientUpdate, 'user_id = ?', [$user['id']]);
                } else {
                    $patientUpdate['user_id'] = $user['id'];
                    $patientUpdate['created_at'] = $updateTime;
                    db()->insert('patient_profiles', $patientUpdate);
                }
            }

            // professional profile
            if (!empty($professionalUpdate)) {
                // map frontend field names to DB columns
                if (isset($professionalUpdate['annees_experience'])) {
                    $professionalUpdate['experience'] = $professionalUpdate['annees_experience'];
                    unset($professionalUpdate['annees_experience']);
                }
                if (isset($professionalUpdate['matricule'])) {
                    $professionalUpdate['matricule_professionnel'] = $professionalUpdate['matricule'];
                    unset($professionalUpdate['matricule']);
                }
                if (isset($professionalUpdate['telephone_pro'])) {
                    $professionalUpdate['telephone_professionnel'] = $professionalUpdate['telephone_pro'];
                    unset($professionalUpdate['telephone_pro']);
                }
                if (isset($professionalUpdate['adresse_pro'])) {
                    $professionalUpdate['adresse_professionnelle'] = $professionalUpdate['adresse_pro'];
                    unset($professionalUpdate['adresse_pro']);
                }
                // statut from profile editing should not overwrite validation status
                if (isset($professionalUpdate['statut'])) {
                    unset($professionalUpdate['statut']);
                }
                $professionalUpdate['updated_at'] = $updateTime;
                $exists = db()->fetchOne('SELECT id FROM professional_profiles WHERE user_id = ?', [$user['id']]);
                if ($exists) {
                    db()->update('professional_profiles', $professionalUpdate, 'user_id = ?', [$user['id']]);
                } else {
                    $professionalUpdate['user_id'] = $user['id'];
                    $professionalUpdate['created_at'] = $updateTime;
                    db()->insert('professional_profiles', $professionalUpdate);
                }
            }
        } else {
            // Fallback file updates
            if (!empty($userUpdate)) {
                self::updateUserInFile($user['id'], $userUpdate);
            }
            if (!empty($patientUpdate)) {
                $pf = __DIR__ . '/../../storage/data/patient_profile_' . $user['id'] . '.json';
                $existing = file_exists($pf) ? (json_decode(file_get_contents($pf), true) ?: []) : [];
                $merged = array_merge($existing, $patientUpdate, ['user_id' => $user['id']]);
                file_put_contents($pf, json_encode($merged, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            }
            if (!empty($professionalUpdate)) {
                $pf = __DIR__ . '/../../storage/data/professional_profile_' . $user['id'] . '.json';
                $existing = file_exists($pf) ? (json_decode(file_get_contents($pf), true) ?: []) : [];
                $merged = array_merge($existing, $professionalUpdate, ['user_id' => $user['id']]);
                file_put_contents($pf, json_encode($merged, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            }
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
     * GET /api/profile/documents - lister les documents (pour le user courant)
     */
    public static function listDocuments() {
        $user = Auth::requireAuth();
        $pdo = get_db();
        $docs = [];
        if ($pdo) {
            $docs = db()->fetchAll('SELECT id, uuid, filename, url, type, verified, created_at FROM professional_documents WHERE user_id = ? ORDER BY created_at DESC', [$user['id']]);
        } else {
            $docsFile = __DIR__ . '/../../storage/data/documents_' . $user['id'] . '.json';
            if (file_exists($docsFile)) {
                $docs = json_decode(file_get_contents($docsFile), true) ?: [];
            }
        }
        Response::success(['documents' => $docs]);
    }

    /**
     * POST /api/profile/documents - upload d'un document professionnel
     */
    public static function addDocument() {
        $user = Auth::requireAuth();

        if (!isset($_FILES['document']) || $_FILES['document']['error'] === UPLOAD_ERR_NO_FILE) {
            Response::error('Aucun fichier fourni', 400);
        }

        $file = $_FILES['document'];
        if ($file['error'] !== UPLOAD_ERR_OK) {
            Response::error('Erreur lors du telechargement', 400);
        }

        // Limiter a 10MB
        if ($file['size'] > 10 * 1024 * 1024) {
            Response::error('Fichier trop volumineux (max 10MB)', 413);
        }

        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        $allowed = ['application/pdf','image/jpeg','image/png','image/webp'];
        if (!in_array($mimeType, $allowed)) {
            Response::error('Type de fichier non autorise', 400);
        }

        // Dest
        $docsDir = __DIR__ . '/../../storage/documents/' . $user['id'];
        if (!is_dir($docsDir)) mkdir($docsDir, 0755, true);

        $ext = pathinfo($file['name'], PATHINFO_EXTENSION) ?: 'dat';
        $uuid = generateUUID();
        $filename = $uuid . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '_', substr($file['name'], 0, 200));
        $dest = $docsDir . '/' . $filename;

        if (!move_uploaded_file($file['tmp_name'], $dest)) {
            Response::serverError('Impossible de sauvegarder le fichier');
        }

        $url = '/storage/documents/' . $user['id'] . '/' . $filename;

        // document type (e.g. diplome, carte_professionnelle) can be provided by client
        $data = getRequestBody();
        $docType = $data['type_document'] ?? ($_POST['type_document'] ?? null);

        $pdo = get_db();
        if ($pdo) {
            $id = db()->insert('professional_documents', [
                'uuid' => $uuid,
                'user_id' => $user['id'],
                'filename' => $file['name'],
                'url' => $url,
                'type' => $mimeType,
                'type_document' => $docType,
                'statut_validation' => 'pending',
                'commentaire_admin' => null,
                'date_validation' => null,
                'verified' => 0,
                'created_at' => date('Y-m-d H:i:s')
            ]);
            if (!$id) Response::serverError('Erreur lors de l\'enregistrement du document');
            $doc = db()->fetchOne('SELECT id, uuid, filename, url, type, type_document, statut_validation, commentaire_admin, date_validation, created_at FROM professional_documents WHERE id = ?', [$id]);
            Response::created(['document' => $doc], 'Document enregistre');
        } else {
            // fallback file
            $docsFile = __DIR__ . '/../../storage/data/documents_' . $user['id'] . '.json';
            $docs = file_exists($docsFile) ? (json_decode(file_get_contents($docsFile), true) ?: []) : [];
            $docs[] = ['id' => count($docs) + 1, 'uuid' => $uuid, 'filename' => $file['name'], 'url' => $url, 'type' => $mimeType, 'type_document' => $docType, 'statut_validation' => 'pending', 'verified' => 0, 'created_at' => date('c')];
            file_put_contents($docsFile, json_encode($docs, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            Response::created(['document' => end($docs)], 'Document enregistre (fallback)');
        }
    }

    /**
     * PUT /api/profile/documents/:id/verify - verifier un document (admin)
     */
    public static function verifyDocument($id) {
        $admin = Auth::requireAuth();
        if (!isset($admin['role']) || $admin['role'] !== 'admin') {
            Response::forbidden('Acces refuse');
        }

        $data = getRequestBody();
        $action = $data['action'] ?? ($data['approved'] ?? null);
        // Normalize: allow {approved: true} or {action: 'approve'|'reject'}
        $approve = null;
        if ($action === 'approve' || $action === true || $action === 'approved') $approve = true;
        if ($action === 'reject' || $action === false || $action === 'rejected') $approve = false;
        $comment = $data['comment'] ?? null;

        $pdo = get_db();
        if (!$pdo) {
            Response::error('Operation non supportee en mode fichier', 400);
        }

        $doc = db()->fetchOne('SELECT * FROM professional_documents WHERE id = ?', [$id]);
        if (!$doc) Response::notFound('Document non trouve');

        if ($approve === null) {
            Response::error('Action invalide (approve/reject attendu)', 400);
        }

        $now = date('Y-m-d H:i:s');
        $newStatus = $approve ? 'approved' : 'rejected';
        // Update document status and legacy `verified` flag
        $docUpdate = db()->update('professional_documents', [
            'statut_validation' => $newStatus,
            'commentaire_admin' => $comment,
            'date_validation' => $now,
            'verified' => $approve ? 1 : 0,
            'updated_at' => $now
        ], 'id = ?', [$id]);
        if (!$docUpdate) {
            Logger::error('Failed to update professional_documents', ['document_id' => $id]);
            Response::serverError('Impossible de mettre a jour le document');
        }

        // After updating the document, determine whether the professional should be validated.
        $userId = $doc['user_id'];
        if ($approve) {
            // Check if all documents for this user are approved
            $otherDocs = db()->fetchAll('SELECT id, statut_validation FROM professional_documents WHERE user_id = ?', [$userId]);
            $allApproved = true;
            foreach ($otherDocs as $od) {
                if (($od['statut_validation'] ?? '') !== 'approved') {
                    $allApproved = false;
                    break;
                }
            }

            if ($allApproved) {
                // Some DB schemas may not include 'approved' in users.status enum.
                // Use 'active' for users.status while keeping professional_profiles.statut_validation = 'approved'.
                $uRes = db()->update('users', ['status' => 'active', 'updated_at' => $now], 'id = ?', [$userId]);
                if (!$uRes) {
                    Logger::error('Failed to update users.status on document approval', ['user_id' => $userId, 'document_id' => $id]);
                }
                $pp = db()->fetchOne('SELECT id FROM professional_profiles WHERE user_id = ?', [$userId]);
                if ($pp) {
                    $ppRes = db()->update('professional_profiles', ['statut_validation' => 'approved', 'updated_at' => $now], 'user_id = ?', [$userId]);
                    if (!$ppRes) Logger::error('Failed to update professional_profiles', ['user_id' => $userId]);
                } else {
                    $ppRes = db()->insert('professional_profiles', ['user_id' => $userId, 'statut_validation' => 'approved', 'created_at' => $now]);
                    if (!$ppRes) Logger::error('Failed to insert professional_profiles', ['user_id' => $userId]);
                }
                $userFullyValidated = true;
                // Notify the professional that their account is now validated
                db()->insert('notifications', [
                    'user_id' => $userId,
                    'type' => 'success',
                    'titre' => 'Compte professionnel valide',
                    'message' => 'Votre compte professionnel a ete valide par un administrateur. Vous pouvez desormais acceder a toutes les fonctionnalites professionnelles.',
                    'link' => '/professional/profile'
                ]);
            } else {
                // Not all documents approved yet — keep user status as pending (do not promote)
                $userFullyValidated = false;
            }
        } else {
            // rejection: set user to restricted and professional profile to rejected
            // Use a valid enum value for users.status. 'restricted' is not in the enum, use 'suspended'.
            $uRes = db()->update('users', ['status' => 'suspended', 'updated_at' => $now], 'id = ?', [$userId]);
            if (!$uRes) Logger::error('Failed to update users.status on document rejection', ['user_id' => $userId]);
            $pp = db()->fetchOne('SELECT id FROM professional_profiles WHERE user_id = ?', [$userId]);
            if ($pp) {
                $ppRes = db()->update('professional_profiles', ['statut_validation' => 'rejected', 'updated_at' => $now], 'user_id = ?', [$userId]);
                if (!$ppRes) Logger::error('Failed to update professional_profiles', ['user_id' => $userId]);
            } else {
                $ppRes = db()->insert('professional_profiles', ['user_id' => $userId, 'statut_validation' => 'rejected', 'created_at' => $now]);
                if (!$ppRes) Logger::error('Failed to insert professional_profiles', ['user_id' => $userId]);
            }
            $userFullyValidated = false;
        }

        Logger::info('Document validation', ['admin_id' => $admin['id'], 'document_id' => $id, 'action' => $newStatus, 'user_id' => $userId]);

        // Return the updated document and whether the user is now fully validated
        $updated = db()->fetchOne('SELECT id, uuid, user_id, filename, url, type, type_document, statut_validation, commentaire_admin, date_validation, verified, created_at FROM professional_documents WHERE id = ?', [$id]);
        $payload = ['document' => $updated, 'user_fully_validated' => !empty($userFullyValidated)];
        $msg = $approve ? ($userFullyValidated ? 'Document approuve et professionnel valide' : 'Document approuve (d autres documents en attente)') : 'Document refuse';
        Response::success($payload, $msg);
    }

    /**
     * DELETE /api/profile/documents/:id - delete a document (owner or admin)
     */
    public static function deleteDocument($id) {
        $user = Auth::requireAuth();
        $pdo = get_db();
        if (!$pdo) Response::error('Operation non supportee en mode fichier', 400);

        $doc = db()->fetchOne('SELECT * FROM professional_documents WHERE id = ?', [$id]);
        if (!$doc) Response::notFound('Document non trouve');

        // Only owner or admin can delete; owners only if pending
        if ($user['id'] != $doc['user_id'] && ($user['role'] ?? '') !== 'admin') {
            Response::forbidden('Acces refuse');
        }

        if (($user['role'] ?? '') !== 'admin') {
            if (isset($doc['statut_validation']) && $doc['statut_validation'] !== 'pending') {
                Response::forbidden('Impossible de supprimer un document deja valide ou refuse');
            }
        }

        // remove file from storage if exists
        $path = __DIR__ . '/../../storage' . ($doc['url'] ?? '');
        if ($path && file_exists($path)) {
            @unlink($path);
        }

        db()->delete('professional_documents', 'id = ?', [$id]);
        Response::success(['id' => $id], 'Document supprime');
    }

    /**
     * GET /api/admin/documents - admin listing of all documents
     */
    public static function adminListDocuments() {
        $user = Auth::requireAuth();
        if (!isset($user['role']) || $user['role'] !== 'admin') {
            Response::forbidden('Acces refuse');
        }

        $pdo = get_db();
        $docs = [];
        if ($pdo) {
            $userId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : null;
            if ($userId) {
                $docs = db()->fetchAll(
                    'SELECT pd.id, pd.uuid, pd.user_id, pd.filename, pd.url, pd.type, pd.type_document, pd.statut_validation, pd.commentaire_admin, pd.date_validation, pd.created_at, u.nom, u.prenom, u.email
                     FROM professional_documents pd
                     LEFT JOIN users u ON pd.user_id = u.id
                     WHERE pd.user_id = ?
                     ORDER BY pd.created_at DESC',
                    [$userId]
                );
            } else {
                $docs = db()->fetchAll(
                    'SELECT pd.id, pd.uuid, pd.user_id, pd.filename, pd.url, pd.type, pd.verified, pd.created_at, u.nom, u.prenom, u.email
                     FROM professional_documents pd
                     LEFT JOIN users u ON pd.user_id = u.id
                     ORDER BY pd.created_at DESC'
                );
            }
        } else {
            // fallback: scan storage/data for documents_*.json
            $docs = [];
            $dir = __DIR__ . '/../../storage/data';
            foreach (glob($dir . '/documents_*.json') as $f) {
                $arr = json_decode(file_get_contents($f), true) ?: [];
                foreach ($arr as $d) $docs[] = $d;
            }
        }

        Response::success(['documents' => $docs]);
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

<?php
/**
 * UNGUEALHEALTH - AnalysisController
 * Gestion des analyses d'images d'ongles
 */

class AnalysisController {
    
    /**
     * POST /api/upload - Upload d'une image pour analyse
     */
    public static function upload() {
        global $config;
        
        // Authentification optionnelle
        $user = Auth::getCurrentUser();
        $userId = $user ? $user['id'] : null;
        
        // Verifier la presence du fichier
        if (!isset($_FILES['image']) || $_FILES['image']['error'] === UPLOAD_ERR_NO_FILE) {
            Response::error('Aucune image fournie', 400);
        }
        
        $file = $_FILES['image'];
        
        // Verifier les erreurs d'upload
        if ($file['error'] !== UPLOAD_ERR_OK) {
            $errors = [
                UPLOAD_ERR_INI_SIZE => 'Fichier trop volumineux (limite serveur)',
                UPLOAD_ERR_FORM_SIZE => 'Fichier trop volumineux (limite formulaire)',
                UPLOAD_ERR_PARTIAL => 'Fichier partiellement telecharge',
                UPLOAD_ERR_NO_TMP_DIR => 'Dossier temporaire manquant',
                UPLOAD_ERR_CANT_WRITE => 'Erreur d\'ecriture sur le disque',
            ];
            Response::error($errors[$file['error']] ?? 'Erreur d\'upload', 400);
        }
        
        // Verifier la taille
        if ($file['size'] > $config['uploads']['max_size']) {
            Response::error('Fichier trop volumineux (max 10MB)', 413);
        }
        
        // Verifier le type MIME
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
        
        if (!in_array($mimeType, $config['uploads']['allowed_types'])) {
            Response::error('Type de fichier non autorise. Utilisez JPG, PNG ou WebP', 400);
        }
        
        // Verifier que c'est bien une image valide
        $imageInfo = getimagesize($file['tmp_name']);
        if (!$imageInfo) {
            Response::error('Le fichier n\'est pas une image valide', 400);
        }
        
        // Generer un nom unique
        $uuid = generateUUID();
        $extension = match($mimeType) {
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            default => 'jpg'
        };
        $filename = "img_{$uuid}.{$extension}";
        $destPath = $config['uploads']['dir'] . '/' . $filename;
        
        // Deplacer le fichier
        if (!move_uploaded_file($file['tmp_name'], $destPath)) {
            Logger::error('Failed to move uploaded file', ['file' => $filename]);
            Response::serverError('Erreur lors de la sauvegarde du fichier');
        }
        
        // Creer un thumbnail
        $thumbnailPath = self::createThumbnail($destPath, $uuid);
        
        // Creer l'enregistrement d'analyse
        $analysisData = [
            'uuid' => $uuid,
            'user_id' => $userId,
            'image_path' => '/storage/uploads/' . $filename,
            'image_original_name' => sanitizeFilename($file['name']),
            'image_size' => $file['size'],
            'image_mime_type' => $mimeType,
            'thumbnail_path' => $thumbnailPath ? '/storage/thumbnails/' . basename($thumbnailPath) : null,
            'status' => 'pending',
            'ip_address' => getClientIp(),
            'user_agent' => getUserAgent(),
            'date_analyse' => date('Y-m-d H:i:s'),
        ];
        
        // Ajouter les metadonnees optionnelles
        if (isset($_POST['doigt_concerne'])) {
            $analysisData['doigt_concerne'] = $_POST['doigt_concerne'];
        }
        if (isset($_POST['main_pied'])) {
            $analysisData['main_pied'] = $_POST['main_pied'];
        }
        if (isset($_POST['notes'])) {
            $analysisData['notes_utilisateur'] = substr($_POST['notes'], 0, 1000);
        }
        
        // Sauvegarder en base ou fichier
        $analysisId = self::saveAnalysis($analysisData);
        
        Logger::info('Image uploaded', [
            'analysis_id' => $analysisId,
            'uuid' => $uuid,
            'user_id' => $userId,
            'size' => $file['size']
        ]);
        
        Response::created([
            'analysis_id' => $analysisId,
            'uuid' => $uuid,
            'status' => 'pending',
            'image_url' => $analysisData['image_path'],
            'thumbnail_url' => $analysisData['thumbnail_path'],
            'message' => 'Image telechargee avec succes. Lancez l\'analyse.'
        ], 'Image telechargee');
    }
    
    /**
     * POST /api/analyze - Lancer l'analyse IA sur une image
     */
    public static function analyze() {
        global $config;
        
        $data = getRequestBody();
        
        // Accepter soit analysis_id soit uuid
        $analysisId = $data['analysis_id'] ?? $data['uuid'] ?? $_POST['analysis_id'] ?? $_POST['uuid'] ?? null;
        
        if (!$analysisId) {
            Response::error('analysis_id ou uuid requis', 400);
        }
        
        // Recuperer l'analyse
        $analysis = self::getAnalysis($analysisId);
        
        if (!$analysis) {
            Response::notFound('Analyse non trouvee');
        }
        
        // Verifier le statut
        if ($analysis['status'] === 'processing') {
            Response::error('Analyse deja en cours', 409);
        }
        
        if ($analysis['status'] === 'completed') {
            // Retourner le resultat existant
            Response::success([
                'analysis_id' => $analysis['id'] ?? $analysis['uuid'],
                'uuid' => $analysis['uuid'],
                'status' => 'completed',
                'result' => json_decode($analysis['result_json'] ?? '{}', true),
                'pathologie' => $analysis['pathologie_label'],
                'score_confiance' => (float)($analysis['score_confiance'] ?? 0),
                'niveau_risque' => $analysis['niveau_risque'],
                'conseils' => self::getConseils($analysis['id'] ?? $analysis['uuid']),
                'completed_at' => $analysis['completed_at']
            ], 'Analyse deja completee');
        }
        
        // Mettre a jour le statut
        self::updateAnalysisStatus($analysis['id'] ?? $analysis['uuid'], 'processing');
        
        // Construire le chemin complet de l'image
        $imagePath = __DIR__ . '/../..' . $analysis['image_path'];
        
        if (!file_exists($imagePath)) {
            self::updateAnalysisStatus($analysis['id'] ?? $analysis['uuid'], 'failed', 'Image introuvable');
            Response::error('Image introuvable sur le serveur', 404);
        }
        
        // Appeler le service IA
        $startTime = microtime(true);
        $iaResult = self::callIAService($imagePath);
        $processingTime = round((microtime(true) - $startTime) * 1000);
        
        if (!$iaResult || isset($iaResult['error'])) {
            self::updateAnalysisStatus(
                $analysis['id'] ?? $analysis['uuid'], 
                'failed', 
                $iaResult['error'] ?? 'Erreur du service IA'
            );
            Response::error('Erreur lors de l\'analyse IA: ' . ($iaResult['error'] ?? 'Service indisponible'), 502);
        }
        
        // Traiter le resultat
        $pathologieLabel = $iaResult['prediction']['label'] ?? $iaResult['predictions'][0]['label'] ?? 'Inconnu';
        $scoreConfiance = $iaResult['prediction']['probability'] ?? $iaResult['predictions'][0]['probability'] ?? $iaResult['score'] ?? 0;
        $niveauRisque = self::determineRiskLevel($pathologieLabel, $scoreConfiance);
        $recommandationConsultation = in_array($niveauRisque, ['eleve', 'critique']) ? 1 : 0;
        
        // Trouver l'ID de la pathologie
        $pathologieId = self::getPathologieId($pathologieLabel);
        
        // Mettre a jour l'analyse
        $updateData = [
            'result_json' => json_encode($iaResult, JSON_UNESCAPED_UNICODE),
            'pathologie_detectee_id' => $pathologieId,
            'pathologie_label' => $pathologieLabel,
            'score_confiance' => round($scoreConfiance, 4),
            'niveau_risque' => $niveauRisque,
            'recommandation_consultation' => $recommandationConsultation,
            'model_version' => $iaResult['model_version'] ?? 'v2.0',
            'processing_time_ms' => $processingTime,
            'heatmap_path' => $iaResult['heatmap_url'] ?? null,
            'status' => 'completed',
            'completed_at' => date('Y-m-d H:i:s'),
        ];
        
        self::updateAnalysis($analysis['id'] ?? $analysis['uuid'], $updateData);
        
        // Generer les conseils
        $conseils = self::generateConseils($analysis['id'] ?? $analysis['uuid'], $pathologieLabel, $niveauRisque, $pathologieId);
        
        Logger::info('Analysis completed', [
            'uuid' => $analysis['uuid'],
            'pathologie' => $pathologieLabel,
            'score' => $scoreConfiance,
            'risk' => $niveauRisque,
            'time_ms' => $processingTime
        ]);
        
        Response::success([
            'analysis_id' => $analysis['id'] ?? $analysis['uuid'],
            'uuid' => $analysis['uuid'],
            'status' => 'completed',
            'result' => [
                'pathologie' => $pathologieLabel,
                'score_confiance' => round($scoreConfiance, 2),
                'niveau_risque' => $niveauRisque,
                'recommandation_consultation' => (bool)$recommandationConsultation,
                'predictions' => $iaResult['predictions'] ?? [],
                'heatmap_url' => $iaResult['heatmap_url'] ?? null
            ],
            'conseils' => $conseils,
            'processing_time_ms' => $processingTime,
            'model_version' => $iaResult['model_version'] ?? 'v2.0'
        ], 'Analyse terminee');
    }
    
    /**
     * GET /api/analysis/:id - Obtenir une analyse specifique
     */
    public static function get($id) {
        $user = Auth::getCurrentUser();
        
        $analysis = self::getAnalysis($id);
        
        if (!$analysis) {
            Response::notFound('Analyse non trouvee');
        }
        
        // Verifier l'acces (si connecte, doit etre le proprietaire ou admin)
        if ($user && $analysis['user_id'] && $analysis['user_id'] != $user['id'] && $user['role'] !== 'admin') {
            Response::forbidden('Acces non autorise');
        }
        
        $conseils = self::getConseils($analysis['id'] ?? $analysis['uuid']);
        
        Response::success([
            'analysis' => [
                'id' => $analysis['id'] ?? $analysis['uuid'],
                'uuid' => $analysis['uuid'],
                'image_url' => $analysis['image_path'],
                'thumbnail_url' => $analysis['thumbnail_path'],
                'status' => $analysis['status'],
                'pathologie' => $analysis['pathologie_label'],
                'score_confiance' => (float)($analysis['score_confiance'] ?? 0),
                'niveau_risque' => $analysis['niveau_risque'],
                'recommandation_consultation' => (bool)($analysis['recommandation_consultation'] ?? false),
                'result' => json_decode($analysis['result_json'] ?? '{}', true),
                'doigt_concerne' => $analysis['doigt_concerne'] ?? null,
                'main_pied' => $analysis['main_pied'] ?? null,
                'notes' => $analysis['notes_utilisateur'] ?? null,
                'model_version' => $analysis['model_version'],
                'processing_time_ms' => $analysis['processing_time_ms'],
                'date_analyse' => $analysis['date_analyse'],
                'completed_at' => $analysis['completed_at'] ?? null
            ],
            'conseils' => $conseils
        ]);
    }
    
    /**
     * POST /api/analysis/:id/feedback - Soumettre un feedback
     */
    public static function feedback($id) {
        $user = Auth::getCurrentUser();
        $data = getRequestBody();
        
        $analysis = self::getAnalysis($id);
        if (!$analysis) {
            Response::notFound('Analyse non trouvee');
        }
        
        $feedbackData = [
            'user_id' => $user ? $user['id'] : null,
            'analysis_id' => $analysis['id'] ?? null,
            'type' => $data['type'] ?? 'precision',
            'rating' => isset($data['rating']) ? min(5, max(1, (int)$data['rating'])) : null,
            'resultat_correct' => isset($data['resultat_correct']) ? (int)$data['resultat_correct'] : null,
            'commentaire' => isset($data['commentaire']) ? substr($data['commentaire'], 0, 2000) : null,
            'diagnostic_reel' => $data['diagnostic_reel'] ?? null,
            'status' => 'new',
            'created_at' => date('Y-m-d H:i:s')
        ];
        
        $pdo = get_db();
        if ($pdo) {
            db()->insert('feedback', $feedbackData);
        } else {
            // Fallback fichier
            $feedbackFile = __DIR__ . '/../../storage/data/feedback.json';
            $feedbacks = [];
            if (file_exists($feedbackFile)) {
                $feedbacks = json_decode(file_get_contents($feedbackFile), true) ?: [];
            }
            $feedbackData['id'] = time() . mt_rand(1000, 9999);
            $feedbackData['analysis_uuid'] = $analysis['uuid'];
            $feedbacks[] = $feedbackData;
            file_put_contents($feedbackFile, json_encode($feedbacks, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        }
        
        Logger::info('Feedback submitted', ['analysis_uuid' => $analysis['uuid'], 'rating' => $feedbackData['rating']]);
        
        Response::success(null, 'Merci pour votre retour!');
    }
    
    // ============================================
    // Private Helper Methods
    // ============================================
    
    private static function createThumbnail($sourcePath, $uuid) {
        global $config;
        
        $thumbnailDir = __DIR__ . '/../../storage/thumbnails';
        if (!is_dir($thumbnailDir)) {
            mkdir($thumbnailDir, 0755, true);
        }
        
        $info = getimagesize($sourcePath);
        if (!$info) return null;
        
        $mime = $info['mime'];
        $width = $info[0];
        $height = $info[1];
        
        // Dimensions du thumbnail
        $maxSize = 300;
        if ($width > $height) {
            $newWidth = $maxSize;
            $newHeight = (int)($height * $maxSize / $width);
        } else {
            $newHeight = $maxSize;
            $newWidth = (int)($width * $maxSize / $height);
        }
        
        // Creer l'image source
        $source = match($mime) {
            'image/jpeg' => imagecreatefromjpeg($sourcePath),
            'image/png' => imagecreatefrompng($sourcePath),
            'image/webp' => imagecreatefromwebp($sourcePath),
            default => null
        };
        
        if (!$source) return null;
        
        // Creer le thumbnail
        $thumb = imagecreatetruecolor($newWidth, $newHeight);
        
        // Gerer la transparence pour PNG
        if ($mime === 'image/png') {
            imagealphablending($thumb, false);
            imagesavealpha($thumb, true);
        }
        
        imagecopyresampled($thumb, $source, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
        
        $thumbnailPath = $thumbnailDir . "/thumb_{$uuid}.jpg";
        imagejpeg($thumb, $thumbnailPath, 85);
        
        imagedestroy($source);
        imagedestroy($thumb);
        
        return $thumbnailPath;
    }
    
    private static function saveAnalysis($data) {
        $pdo = get_db();
        if ($pdo) {
            return db()->insert('analyses', $data);
        }
        
        // Fallback fichier
        $analysesFile = __DIR__ . '/../../storage/data/analyses.json';
        $analyses = [];
        if (file_exists($analysesFile)) {
            $analyses = json_decode(file_get_contents($analysesFile), true) ?: [];
        }
        
        $data['id'] = time() . mt_rand(1000, 9999);
        $analyses[] = $data;
        file_put_contents($analysesFile, json_encode($analyses, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        
        return $data['id'];
    }
    
    private static function getAnalysis($id) {
        $pdo = get_db();
        if ($pdo) {
            // Chercher par ID ou UUID
            $analysis = db()->fetchOne('SELECT * FROM analyses WHERE id = ? OR uuid = ?', [$id, $id]);
            if ($analysis) return $analysis;
        }
        
        // Fallback fichier
        $analysesFile = __DIR__ . '/../../storage/data/analyses.json';
        if (!file_exists($analysesFile)) return null;
        
        $analyses = json_decode(file_get_contents($analysesFile), true) ?: [];
        foreach ($analyses as $a) {
            if (($a['id'] ?? '') == $id || ($a['uuid'] ?? '') == $id) {
                return $a;
            }
        }
        return null;
    }
    
    private static function updateAnalysis($id, $data) {
        $pdo = get_db();
        if ($pdo) {
            return db()->update('analyses', $data, 'id = ? OR uuid = ?', [$id, $id]);
        }
        
        // Fallback fichier
        $analysesFile = __DIR__ . '/../../storage/data/analyses.json';
        if (!file_exists($analysesFile)) return false;
        
        $analyses = json_decode(file_get_contents($analysesFile), true) ?: [];
        foreach ($analyses as &$a) {
            if (($a['id'] ?? '') == $id || ($a['uuid'] ?? '') == $id) {
                $a = array_merge($a, $data);
                break;
            }
        }
        file_put_contents($analysesFile, json_encode($analyses, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        return true;
    }
    
    private static function updateAnalysisStatus($id, $status, $error = null) {
        $data = ['status' => $status];
        if ($error) $data['error_message'] = $error;
        self::updateAnalysis($id, $data);
    }
    
    private static function callIAService($imagePath) {
        global $config;
        
        $url = $config['ia']['url'] . '/predict';
        $timeout = $config['ia']['timeout'];
        
        // Preparer la requete multipart
        $ch = curl_init();
        $cfile = curl_file_create($imagePath, mime_content_type($imagePath), basename($imagePath));
        
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_POSTFIELDS => ['image' => $cfile],
            CURLOPT_HTTPHEADER => ['Accept: application/json'],
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        if ($error) {
            Logger::error('IA service error', ['error' => $error, 'url' => $url]);
            return ['error' => 'Service IA indisponible: ' . $error];
        }
        
        if ($httpCode !== 200) {
            Logger::error('IA service HTTP error', ['code' => $httpCode, 'response' => $response]);
            return ['error' => "Service IA a retourne une erreur (HTTP $httpCode)"];
        }
        
        $result = json_decode($response, true);
        if (!$result) {
            Logger::error('IA service invalid response', ['response' => $response]);
            return ['error' => 'Reponse invalide du service IA'];
        }
        
        return $result;
    }
    
    private static function determineRiskLevel($pathologie, $score) {
        // Pathologies a haut risque
        $highRisk = ['melanonychie', 'melanome'];
        $moderateRisk = ['onychomycose', 'psoriasis', 'paronychie', 'lichen'];
        
        $pathologieLower = strtolower($pathologie);
        
        if ($pathologieLower === 'sain' || $score < 0.3) {
            return 'sain';
        }
        
        if (in_array($pathologieLower, $highRisk) && $score > 0.5) {
            return $score > 0.8 ? 'critique' : 'eleve';
        }
        
        if (in_array($pathologieLower, $moderateRisk)) {
            if ($score > 0.8) return 'eleve';
            if ($score > 0.5) return 'modere';
            return 'bas';
        }
        
        if ($score > 0.7) return 'modere';
        if ($score > 0.4) return 'bas';
        return 'sain';
    }
    
    private static function getPathologieId($label) {
        $pdo = get_db();
        if (!$pdo) return null;
        
        $codeMap = [
            'onychomycose' => 'ONYCHO',
            'psoriasis' => 'PSORIASIS',
            'melanonychie' => 'MELANONYCHIE',
            'onycholyse' => 'ONYCHOLYSE',
            'paronychie' => 'PARONYCHI',
            'lichen' => 'LICHEN',
            'hematome' => 'HEMATOME',
            'sain' => 'SAIN',
        ];
        
        $code = $codeMap[strtolower($label)] ?? null;
        if (!$code) return null;
        
        $result = db()->fetchOne('SELECT id FROM pathologies WHERE code = ?', [$code]);
        return $result ? $result['id'] : null;
    }
    
    private static function generateConseils($analysisId, $pathologie, $niveauRisque, $pathologieId = null) {
        $conseils = [];
        $pathologieLower = strtolower($pathologie);
        
        // Conseils selon la pathologie
        $conseilsMap = [
            'onychomycose' => [
                ['type' => 'hygiene', 'titre' => 'Hygiene', 'texte' => 'Gardez vos ongles propres et secs. Sechezles soigneusement apres le lavage.', 'priorite' => 1],
                ['type' => 'prevention', 'titre' => 'Prevention', 'texte' => 'Evitez de marcher pieds nus dans les lieux publics humides (piscines, douches).', 'priorite' => 2],
                ['type' => 'traitement', 'titre' => 'Traitement', 'texte' => 'Des traitements antifongiques topiques sont disponibles en pharmacie. Consultez un dermatologue pour les cas persistants.', 'priorite' => 1],
            ],
            'psoriasis' => [
                ['type' => 'general', 'titre' => 'Information', 'texte' => 'Le psoriasis ungueal est souvent associe au psoriasis cutane. Un suivi dermatologique est recommande.', 'priorite' => 1],
                ['type' => 'traitement', 'titre' => 'Traitement', 'texte' => 'Des traitements locaux (corticoides, derives de vitamine D) peuvent aider. Consultez votre dermatologue.', 'priorite' => 2],
                ['type' => 'hygiene', 'titre' => 'Soins', 'texte' => 'Hydratez regulierement vos ongles et cuticules. Evitez les traumatismes.', 'priorite' => 3],
            ],
            'melanonychie' => [
                ['type' => 'consultation', 'titre' => 'Consultation urgente', 'texte' => 'Une bande pigmentee sur l\'ongle necessite une evaluation dermatologique rapide pour exclure un melanome.', 'priorite' => 1],
                ['type' => 'urgence', 'titre' => 'Surveillance', 'texte' => 'Photographiez l\'ongle regulierement pour suivre l\'evolution. Consultez si la bande s\'elargit ou change de couleur.', 'priorite' => 1],
            ],
            'paronychie' => [
                ['type' => 'hygiene', 'titre' => 'Hygiene', 'texte' => 'Gardez la zone propre. Evitez de vous ronger les ongles ou d\'arracher les peaux.', 'priorite' => 1],
                ['type' => 'traitement', 'titre' => 'Traitement', 'texte' => 'Des bains antiseptiques et des cremes antibiotiques peuvent aider. Consultez si l\'infection s\'aggrave.', 'priorite' => 2],
            ],
            'sain' => [
                ['type' => 'general', 'titre' => 'Bonne nouvelle', 'texte' => 'Votre ongle semble sain! Continuez a en prendre soin.', 'priorite' => 1],
                ['type' => 'prevention', 'titre' => 'Prevention', 'texte' => 'Maintenez une bonne hygiene, coupez vos ongles regulierement et hydratez-les.', 'priorite' => 2],
            ],
        ];
        
        $conseilsData = $conseilsMap[$pathologieLower] ?? [
            ['type' => 'consultation', 'titre' => 'Avis medical', 'texte' => 'En cas de doute, consultez un professionnel de sante pour un diagnostic precis.', 'priorite' => 1]
        ];
        
        // Ajouter conseil de consultation si risque eleve
        if (in_array($niveauRisque, ['eleve', 'critique'])) {
            array_unshift($conseilsData, [
                'type' => 'consultation',
                'titre' => 'Consultation recommandee',
                'texte' => 'Le niveau de risque detecte suggere de consulter un dermatologue dans les meilleurs delais.',
                'priorite' => 1
            ]);
        }
        
        // Sauvegarder les conseils
        $pdo = get_db();
        foreach ($conseilsData as $conseil) {
            $conseil['analysis_id'] = is_numeric($analysisId) ? $analysisId : null;
            $conseil['pathologie_id'] = $pathologieId;
            $conseil['created_at'] = date('Y-m-d H:i:s');
            
            if ($pdo && is_numeric($analysisId)) {
                db()->insert('conseils', $conseil);
            }
            
            $conseils[] = [
                'type' => $conseil['type'],
                'titre' => $conseil['titre'],
                'texte' => $conseil['texte'],
                'priorite' => $conseil['priorite']
            ];
        }
        
        // Trier par priorite
        usort($conseils, fn($a, $b) => $a['priorite'] - $b['priorite']);
        
        return $conseils;
    }
    
    private static function getConseils($analysisId) {
        $pdo = get_db();
        if ($pdo && is_numeric($analysisId)) {
            return db()->fetchAll(
                'SELECT type_conseil as type, titre, texte_conseil as texte, priorite FROM conseils WHERE analysis_id = ? ORDER BY priorite',
                [$analysisId]
            );
        }
        return [];
    }
}

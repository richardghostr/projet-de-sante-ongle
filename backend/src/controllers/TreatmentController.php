<?php
/**
 * UNGUEALHEALTH - Treatment Controller
 * Gestion des plans de traitement et suivi
 */

require_once __DIR__ . '/../bootstrap.php';

class TreatmentController {
    
    /**
     * Liste des plans de traitement de l'utilisateur
     */
    public static function index() {
        $user = Auth::requireAuth();
        
        $status = $_GET['status'] ?? null;
        
        $where = 'tp.user_id = ?';
        $params = [$user['id']];
        
        if ($status && in_array($status, ['active', 'paused', 'completed', 'abandoned'])) {
            $where .= ' AND tp.status = ?';
            $params[] = $status;
        }
        
        $treatments = db()->fetchAll(
            "SELECT tp.*, p.nom as pathologie_nom, p.code as pathologie_code,
                    a.uuid as analysis_uuid,
                    prof.nom as professional_nom,
                    (SELECT COUNT(*) FROM treatment_entries WHERE treatment_plan_id = tp.id) as total_entries,
                    (SELECT MAX(date_entry) FROM treatment_entries WHERE treatment_plan_id = tp.id) as derniere_entree,
                    (SELECT image_path FROM treatment_entries WHERE treatment_plan_id = tp.id AND image_path IS NOT NULL ORDER BY date_entry DESC LIMIT 1) as derniere_photo
             FROM treatment_plans tp
             LEFT JOIN pathologies p ON tp.pathologie_id = p.id
             LEFT JOIN analyses a ON tp.analysis_id = a.id
             LEFT JOIN users prof ON tp.professional_id = prof.id
             WHERE $where
             ORDER BY tp.status = 'active' DESC, tp.created_at DESC",
            $params
        );
        
        Response::success(['treatments' => $treatments]);
    }
    
    /**
     * Creer un nouveau plan de traitement
     */
    public static function create() {
        $user = Auth::requireAuth();
        $data = getRequestBody();
        
        $validator = new Validator($data);
        $validator->required('titre')
                  ->maxLength('titre', 255)
                  ->in('doigt_concerne', ['pouce', 'index', 'majeur', 'annulaire', 'auriculaire', 'orteil'])
                  ->in('main_pied', ['main_gauche', 'main_droite', 'pied_gauche', 'pied_droit'])
                  ->in('frequence_suivi', ['daily', 'every_2_days', 'weekly', 'biweekly', 'monthly']);
        $validator->validate();
        
        // Trouver pathologie si analysis_id fourni
        $pathologieId = null;
        $analysisId = null;
        
        if (!empty($data['analysis_uuid'])) {
            $analysis = db()->fetchOne(
                'SELECT id, pathologie_detectee_id FROM analyses WHERE uuid = ? AND user_id = ?',
                [$data['analysis_uuid'], $user['id']]
            );
            if ($analysis) {
                $analysisId = $analysis['id'];
                $pathologieId = $analysis['pathologie_detectee_id'];
            }
        }
        
        if (!empty($data['pathologie_id'])) {
            $pathologieId = (int)$data['pathologie_id'];
        }
        
        $treatmentData = [
            'uuid' => generateUUID(),
            'user_id' => $user['id'],
            'analysis_id' => $analysisId,
            'pathologie_id' => $pathologieId,
            'titre' => $data['titre'],
            'description' => $data['description'] ?? null,
            'doigt_concerne' => $data['doigt_concerne'] ?? null,
            'main_pied' => $data['main_pied'] ?? null,
            'date_debut' => $data['date_debut'] ?? date('Y-m-d'),
            'date_fin_prevue' => $data['date_fin_prevue'] ?? null,
            'status' => 'active',
            'objectif' => $data['objectif'] ?? null,
            'traitement_prescrit' => $data['traitement_prescrit'] ?? null,
            'frequence_suivi' => $data['frequence_suivi'] ?? 'weekly',
            'rappel_actif' => isset($data['rappel_actif']) ? (int)$data['rappel_actif'] : 1
        ];
        
        $id = db()->insert('treatment_plans', $treatmentData);
        
        if (!$id) {
            Response::serverError('Erreur lors de la creation du traitement');
        }
        
        Logger::info('Treatment plan created', [
            'user_id' => $user['id'],
            'treatment_id' => $id
        ]);
        
        Response::created([
            'id' => $id,
            'uuid' => $treatmentData['uuid']
        ], 'Plan de traitement cree');
    }
    
    /**
     * Details d'un plan de traitement
     */
    public static function show($uuid) {
        $user = Auth::requireAuth();
        
        $treatment = db()->fetchOne(
            "SELECT tp.*, p.nom as pathologie_nom, p.code as pathologie_code,
                    p.description as pathologie_description, p.symptomes as pathologie_symptomes,
                    a.uuid as analysis_uuid, a.image_path as analysis_image,
                    prof.nom as professional_nom, prof.prenom as professional_prenom,
                    prof.specialite as professional_specialite
             FROM treatment_plans tp
             LEFT JOIN pathologies p ON tp.pathologie_id = p.id
             LEFT JOIN analyses a ON tp.analysis_id = a.id
             LEFT JOIN users prof ON tp.professional_id = prof.id
             WHERE tp.uuid = ? AND (tp.user_id = ? OR tp.professional_id = ?)",
            [$uuid, $user['id'], $user['id']]
        );
        
        if (!$treatment) {
            Response::notFound('Plan de traitement non trouve');
        }
        
        // Recuperer les entrees
        $entries = db()->fetchAll(
            "SELECT * FROM treatment_entries WHERE treatment_plan_id = ? ORDER BY date_entry DESC",
            [$treatment['id']]
        );
        
        // Recuperer les notes professionnelles visibles
        $notes = [];
        if ($treatment['professional_id']) {
            $notes = db()->fetchAll(
                "SELECT pn.uuid, pn.type, pn.titre, pn.contenu, pn.importance, pn.created_at,
                        u.nom as professional_nom
                 FROM professional_notes pn
                 JOIN users u ON pn.professional_id = u.id
                 WHERE pn.treatment_plan_id = ? AND pn.visibilite = 'shared_with_patient'
                 ORDER BY pn.created_at DESC",
                [$treatment['id']]
            );
        }
        
        // Statistiques
        $stats = [
            'total_entries' => count($entries),
            'photos_count' => 0,
            'jours_suivi' => 0,
            'derniere_entree' => null
        ];
        
        foreach ($entries as $entry) {
            if ($entry['image_path']) $stats['photos_count']++;
        }
        
        if (!empty($entries)) {
            $stats['derniere_entree'] = $entries[0]['date_entry'];
            $start = new DateTime($treatment['date_debut']);
            $end = new DateTime($entries[0]['date_entry']);
            $stats['jours_suivi'] = $start->diff($end)->days + 1;
        }
        
        Response::success([
            'treatment' => $treatment,
            'entries' => $entries,
            'notes' => $notes,
            'stats' => $stats
        ]);
    }
    
    /**
     * Mettre a jour un plan de traitement
     */
    public static function update($uuid) {
        $user = Auth::requireAuth();
        $data = getRequestBody();
        
        $treatment = db()->fetchOne(
            'SELECT id, user_id FROM treatment_plans WHERE uuid = ? AND user_id = ?',
            [$uuid, $user['id']]
        );
        
        if (!$treatment) {
            Response::notFound('Plan de traitement non trouve');
        }
        
        $allowedFields = ['titre', 'description', 'objectif', 'traitement_prescrit', 
                          'date_fin_prevue', 'frequence_suivi', 'rappel_actif'];
        $updateData = [];
        
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $updateData[$field] = $data[$field];
            }
        }
        
        if (!empty($updateData)) {
            db()->update('treatment_plans', $updateData, 'id = ?', [$treatment['id']]);
        }
        
        Response::success(['message' => 'Plan de traitement mis a jour']);
    }
    
    /**
     * Changer le statut d'un traitement
     */
    public static function updateStatus($uuid) {
        $user = Auth::requireAuth();
        $data = getRequestBody();
        
        $validator = new Validator($data);
        $validator->required('status')
                  ->in('status', ['active', 'paused', 'completed', 'abandoned']);
        $validator->validate();
        
        $treatment = db()->fetchOne(
            'SELECT id, status FROM treatment_plans WHERE uuid = ? AND user_id = ?',
            [$uuid, $user['id']]
        );
        
        if (!$treatment) {
            Response::notFound('Plan de traitement non trouve');
        }
        
        $updateData = ['status' => $data['status']];
        
        if ($data['status'] === 'completed' || $data['status'] === 'abandoned') {
            $updateData['date_fin_reelle'] = date('Y-m-d');
        }
        
        db()->update('treatment_plans', $updateData, 'id = ?', [$treatment['id']]);
        
        Logger::info('Treatment status updated', [
            'user_id' => $user['id'],
            'treatment_id' => $treatment['id'],
            'old_status' => $treatment['status'],
            'new_status' => $data['status']
        ]);
        
        Response::success(['message' => 'Statut mis a jour', 'status' => $data['status']]);
    }
    
    /**
     * Supprimer un plan de traitement
     */
    public static function delete($uuid) {
        $user = Auth::requireAuth();
        
        $treatment = db()->fetchOne(
            'SELECT id FROM treatment_plans WHERE uuid = ? AND user_id = ?',
            [$uuid, $user['id']]
        );
        
        if (!$treatment) {
            Response::notFound('Plan de traitement non trouve');
        }
        
        // Supprimer les images associees
        $entries = db()->fetchAll(
            'SELECT image_path, thumbnail_path FROM treatment_entries WHERE treatment_plan_id = ?',
            [$treatment['id']]
        );
        
        foreach ($entries as $entry) {
            if ($entry['image_path'] && file_exists($entry['image_path'])) {
                unlink($entry['image_path']);
            }
            if ($entry['thumbnail_path'] && file_exists($entry['thumbnail_path'])) {
                unlink($entry['thumbnail_path']);
            }
        }
        
        db()->delete('treatment_plans', 'id = ?', [$treatment['id']]);
        
        Response::success(['message' => 'Plan de traitement supprime']);
    }
    
    /**
     * Ajouter une entree de suivi
     */
    public static function addEntry($uuid) {
        $user = Auth::requireAuth();
        $data = getRequestBody();
        
        $treatment = db()->fetchOne(
            'SELECT id, status FROM treatment_plans WHERE uuid = ? AND user_id = ?',
            [$uuid, $user['id']]
        );
        
        if (!$treatment) {
            Response::notFound('Plan de traitement non trouve');
        }
        
        if ($treatment['status'] !== 'active') {
            Response::error('Ce plan de traitement n\'est plus actif', 400);
        }
        
        $validator = new Validator($data);
        $validator->in('type', ['photo', 'note', 'symptom', 'medication', 'appointment'])
                  ->in('amelioration_percue', ['pire', 'stable', 'legere', 'notable', 'guerison'])
                  ->in('humeur', ['tres_mal', 'mal', 'neutre', 'bien', 'tres_bien']);
        $validator->validate();
        
        $entryData = [
            'uuid' => generateUUID(),
            'treatment_plan_id' => $treatment['id'],
            'user_id' => $user['id'],
            'date_entry' => $data['date_entry'] ?? date('Y-m-d'),
            'type' => $data['type'] ?? 'note',
            'note' => $data['note'] ?? null,
            'symptomes_observes' => isset($data['symptomes_observes']) ? json_encode($data['symptomes_observes']) : null,
            'douleur_niveau' => isset($data['douleur_niveau']) ? min(10, max(0, (int)$data['douleur_niveau'])) : null,
            'amelioration_percue' => $data['amelioration_percue'] ?? null,
            'medicaments_pris' => isset($data['medicaments_pris']) ? json_encode($data['medicaments_pris']) : null,
            'effets_secondaires' => $data['effets_secondaires'] ?? null,
            'humeur' => $data['humeur'] ?? null
        ];
        
        $id = db()->insert('treatment_entries', $entryData);
        
        if (!$id) {
            Response::serverError('Erreur lors de l\'ajout de l\'entree');
        }
        
        Response::created([
            'id' => $id,
            'uuid' => $entryData['uuid']
        ], 'Entree ajoutee');
    }
    
    /**
     * Upload photo pour une entree
     */
    public static function uploadEntryPhoto($uuid) {
        $user = Auth::requireAuth();
        global $config;
        
        $treatment = db()->fetchOne(
            'SELECT id FROM treatment_plans WHERE uuid = ? AND user_id = ?',
            [$uuid, $user['id']]
        );
        
        if (!$treatment) {
            Response::notFound('Plan de traitement non trouve');
        }
        
        if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
            Response::error('Aucune image valide fournie', 400);
        }
        
        $file = $_FILES['image'];
        
        // Validation
        if ($file['size'] > $config['uploads']['max_size']) {
            Response::error('Image trop volumineuse (max 10MB)', 400);
        }
        
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->file($file['tmp_name']);
        
        if (!in_array($mimeType, $config['uploads']['allowed_types'])) {
            Response::error('Type de fichier non autorise', 400);
        }
        
        // Generer nom unique
        $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = 'treatment_' . $treatment['id'] . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
        $uploadPath = $config['uploads']['dir'] . '/treatments/' . $filename;
        
        // Creer dossier si necessaire
        $dir = dirname($uploadPath);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        
        if (!move_uploaded_file($file['tmp_name'], $uploadPath)) {
            Response::serverError('Erreur lors de l\'upload');
        }
        
        // Creer thumbnail
        $thumbnailPath = null;
        $thumbnailDir = __DIR__ . '/../../storage/thumbnails/treatments/';
        if (!is_dir($thumbnailDir)) {
            mkdir($thumbnailDir, 0755, true);
        }
        $thumbnailPath = $thumbnailDir . 'thumb_' . $filename;
        
        // Simple resize avec GD
        if (function_exists('imagecreatefromjpeg')) {
            $source = null;
            if ($mimeType === 'image/jpeg') {
                $source = imagecreatefromjpeg($uploadPath);
            } elseif ($mimeType === 'image/png') {
                $source = imagecreatefrompng($uploadPath);
            } elseif ($mimeType === 'image/webp') {
                $source = imagecreatefromwebp($uploadPath);
            }
            
            if ($source) {
                $width = imagesx($source);
                $height = imagesy($source);
                $newWidth = 200;
                $newHeight = (int)($height * ($newWidth / $width));
                
                $thumb = imagecreatetruecolor($newWidth, $newHeight);
                imagecopyresampled($thumb, $source, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
                imagejpeg($thumb, $thumbnailPath, 80);
                imagedestroy($source);
                imagedestroy($thumb);
            }
        }
        
        // Creer l'entree
        $entryData = [
            'uuid' => generateUUID(),
            'treatment_plan_id' => $treatment['id'],
            'user_id' => $user['id'],
            'date_entry' => $_POST['date_entry'] ?? date('Y-m-d'),
            'type' => 'photo',
            'image_path' => $uploadPath,
            'thumbnail_path' => $thumbnailPath,
            'note' => $_POST['note'] ?? null,
            'amelioration_percue' => $_POST['amelioration_percue'] ?? null
        ];
        
        $id = db()->insert('treatment_entries', $entryData);
        
        Response::created([
            'id' => $id,
            'uuid' => $entryData['uuid'],
            'image_path' => '/api/treatments/' . $uuid . '/photos/' . $entryData['uuid']
        ], 'Photo ajoutee');
    }
    
    /**
     * Recuperer une photo
     */
    public static function getPhoto($treatmentUuid, $entryUuid) {
        $user = Auth::requireAuth();
        
        $entry = db()->fetchOne(
            "SELECT te.image_path, te.thumbnail_path
             FROM treatment_entries te
             JOIN treatment_plans tp ON te.treatment_plan_id = tp.id
             WHERE te.uuid = ? AND tp.uuid = ? AND (tp.user_id = ? OR tp.professional_id = ?)",
            [$entryUuid, $treatmentUuid, $user['id'], $user['id']]
        );
        
        if (!$entry || !$entry['image_path']) {
            Response::notFound('Photo non trouvee');
        }
        
        $size = $_GET['size'] ?? 'full';
        $path = $size === 'thumb' && $entry['thumbnail_path'] ? $entry['thumbnail_path'] : $entry['image_path'];
        
        if (!file_exists($path)) {
            Response::notFound('Fichier non trouve');
        }
        
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->file($path);
        
        header('Content-Type: ' . $mimeType);
        header('Content-Length: ' . filesize($path));
        header('Cache-Control: private, max-age=86400');
        readfile($path);
        exit;
    }
    
    /**
     * Mettre a jour une entree
     */
    public static function updateEntry($treatmentUuid, $entryUuid) {
        $user = Auth::requireAuth();
        $data = getRequestBody();
        
        $entry = db()->fetchOne(
            "SELECT te.id
             FROM treatment_entries te
             JOIN treatment_plans tp ON te.treatment_plan_id = tp.id
             WHERE te.uuid = ? AND tp.uuid = ? AND tp.user_id = ?",
            [$entryUuid, $treatmentUuid, $user['id']]
        );
        
        if (!$entry) {
            Response::notFound('Entree non trouvee');
        }
        
        $allowedFields = ['note', 'symptomes_observes', 'douleur_niveau', 'amelioration_percue',
                          'medicaments_pris', 'effets_secondaires', 'humeur'];
        $updateData = [];
        
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                if (in_array($field, ['symptomes_observes', 'medicaments_pris'])) {
                    $updateData[$field] = json_encode($data[$field]);
                } else {
                    $updateData[$field] = $data[$field];
                }
            }
        }
        
        if (!empty($updateData)) {
            db()->update('treatment_entries', $updateData, 'id = ?', [$entry['id']]);
        }
        
        Response::success(['message' => 'Entree mise a jour']);
    }
    
    /**
     * Supprimer une entree
     */
    public static function deleteEntry($treatmentUuid, $entryUuid) {
        $user = Auth::requireAuth();
        
        $entry = db()->fetchOne(
            "SELECT te.id, te.image_path, te.thumbnail_path
             FROM treatment_entries te
             JOIN treatment_plans tp ON te.treatment_plan_id = tp.id
             WHERE te.uuid = ? AND tp.uuid = ? AND tp.user_id = ?",
            [$entryUuid, $treatmentUuid, $user['id']]
        );
        
        if (!$entry) {
            Response::notFound('Entree non trouvee');
        }
        
        // Supprimer les fichiers
        if ($entry['image_path'] && file_exists($entry['image_path'])) {
            unlink($entry['image_path']);
        }
        if ($entry['thumbnail_path'] && file_exists($entry['thumbnail_path'])) {
            unlink($entry['thumbnail_path']);
        }
        
        db()->delete('treatment_entries', 'id = ?', [$entry['id']]);
        
        Response::success(['message' => 'Entree supprimee']);
    }
    
    /**
     * Timeline de photos pour comparaison
     */
    public static function photoTimeline($uuid) {
        $user = Auth::requireAuth();
        
        $treatment = db()->fetchOne(
            'SELECT id FROM treatment_plans WHERE uuid = ? AND (user_id = ? OR professional_id = ?)',
            [$uuid, $user['id'], $user['id']]
        );
        
        if (!$treatment) {
            Response::notFound('Plan de traitement non trouve');
        }
        
        $photos = db()->fetchAll(
            "SELECT uuid, date_entry, note, amelioration_percue, created_at
             FROM treatment_entries
             WHERE treatment_plan_id = ? AND image_path IS NOT NULL
             ORDER BY date_entry ASC",
            [$treatment['id']]
        );
        
        // Ajouter URL des images
        foreach ($photos as &$photo) {
            $photo['image_url'] = '/api/treatments/' . $uuid . '/photos/' . $photo['uuid'];
            $photo['thumbnail_url'] = '/api/treatments/' . $uuid . '/photos/' . $photo['uuid'] . '?size=thumb';
        }
        
        Response::success(['photos' => $photos]);
    }
    
    /**
     * Statistiques du traitement
     */
    public static function stats($uuid) {
        $user = Auth::requireAuth();
        
        $treatment = db()->fetchOne(
            'SELECT tp.*, p.nom as pathologie_nom
             FROM treatment_plans tp
             LEFT JOIN pathologies p ON tp.pathologie_id = p.id
             WHERE tp.uuid = ? AND (tp.user_id = ? OR tp.professional_id = ?)',
            [$uuid, $user['id'], $user['id']]
        );
        
        if (!$treatment) {
            Response::notFound('Plan de traitement non trouve');
        }
        
        $entries = db()->fetchAll(
            'SELECT date_entry, type, douleur_niveau, amelioration_percue, humeur
             FROM treatment_entries
             WHERE treatment_plan_id = ?
             ORDER BY date_entry ASC',
            [$treatment['id']]
        );
        
        $stats = [
            'duree_jours' => 0,
            'total_entries' => count($entries),
            'photos_count' => 0,
            'amelioration_trend' => [],
            'douleur_trend' => [],
            'humeur_distribution' => [],
            'frequence_reelle' => 0
        ];
        
        // Calculs
        $start = new DateTime($treatment['date_debut']);
        $end = new DateTime();
        $stats['duree_jours'] = $start->diff($end)->days + 1;
        
        $ameliorationMap = ['pire' => -2, 'stable' => 0, 'legere' => 1, 'notable' => 2, 'guerison' => 3];
        $humeurCount = [];
        
        foreach ($entries as $entry) {
            if ($entry['type'] === 'photo') $stats['photos_count']++;
            
            if ($entry['douleur_niveau'] !== null) {
                $stats['douleur_trend'][] = [
                    'date' => $entry['date_entry'],
                    'value' => (int)$entry['douleur_niveau']
                ];
            }
            
            if ($entry['amelioration_percue']) {
                $stats['amelioration_trend'][] = [
                    'date' => $entry['date_entry'],
                    'value' => $ameliorationMap[$entry['amelioration_percue']] ?? 0,
                    'label' => $entry['amelioration_percue']
                ];
            }
            
            if ($entry['humeur']) {
                $humeurCount[$entry['humeur']] = ($humeurCount[$entry['humeur']] ?? 0) + 1;
            }
        }
        
        $stats['humeur_distribution'] = $humeurCount;
        
        if ($stats['duree_jours'] > 0 && count($entries) > 0) {
            $stats['frequence_reelle'] = round(count($entries) / ($stats['duree_jours'] / 7), 1);
        }
        
        Response::success($stats);
    }
}

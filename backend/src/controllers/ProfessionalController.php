<?php
/**
 * UNGUEALHEALTH - Professional Controller
 * Fonctionnalites pour professionnels de sante
 */

require_once __DIR__ . '/../bootstrap.php';

class ProfessionalController {
    
    /**
     * Dashboard professionnel
     */
    public static function dashboard() {
        $user = Auth::requireRole(['professional', 'admin']);
        
        $stats = [
            'patients' => ['total' => 0, 'pending_requests' => 0],
            'notes' => ['total' => 0, 'this_week' => 0],
            'treatments_supervised' => 0,
            'recent_activity' => []
        ];
        
        $pdo = get_db();
        if ($pdo) {
            // Patients lies
            $result = db()->fetchOne(
                'SELECT COUNT(*) as total FROM professional_patient_links WHERE professional_id = ? AND status = "active"',
                [$user['id']]
            );
            $stats['patients']['total'] = (int)($result['total'] ?? 0);
            
            $result = db()->fetchOne(
                'SELECT COUNT(*) as total FROM professional_patient_links WHERE professional_id = ? AND status = "pending"',
                [$user['id']]
            );
            $stats['patients']['pending_requests'] = (int)($result['total'] ?? 0);
            
            // Notes
            $result = db()->fetchOne(
                'SELECT COUNT(*) as total FROM professional_notes WHERE professional_id = ?',
                [$user['id']]
            );
            $stats['notes']['total'] = (int)($result['total'] ?? 0);
            
            $result = db()->fetchOne(
                'SELECT COUNT(*) as total FROM professional_notes WHERE professional_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)',
                [$user['id']]
            );
            $stats['notes']['this_week'] = (int)($result['total'] ?? 0);
            
            // Traitements supervises
            $result = db()->fetchOne(
                'SELECT COUNT(*) as total FROM treatment_plans WHERE professional_id = ? AND status = "active"',
                [$user['id']]
            );
            $stats['treatments_supervised'] = (int)($result['total'] ?? 0);
            
            // Activite recente
            $stats['recent_activity'] = db()->fetchAll(
                'SELECT pn.id, pn.type, pn.titre, pn.created_at, u.nom as patient_nom
                 FROM professional_notes pn
                 JOIN users u ON pn.user_id = u.id
                 WHERE pn.professional_id = ?
                 ORDER BY pn.created_at DESC
                 LIMIT 10',
                [$user['id']]
            );
        }
        
        Response::success($stats);
    }
    
    /**
     * Liste des patients lies au professionnel
     */
    public static function listPatients() {
        $user = Auth::requireRole(['professional', 'admin']);
        
        $status = $_GET['status'] ?? 'active';
        
        $patients = db()->fetchAll(
            'SELECT ppl.id as link_id, ppl.status as link_status, ppl.created_at as linked_at,
                    u.id, u.nom, u.prenom, u.email, u.telephone, u.avatar_url,
                    (SELECT COUNT(*) FROM analyses WHERE user_id = u.id) as total_analyses,
                    (SELECT COUNT(*) FROM treatment_plans WHERE user_id = u.id AND status = "active") as active_treatments
             FROM professional_patient_links ppl
             JOIN users u ON ppl.patient_id = u.id
             WHERE ppl.professional_id = ? AND ppl.status = ?
             ORDER BY ppl.created_at DESC',
            [$user['id'], $status]
        );
        
        Response::success(['patients' => $patients]);
    }
    
    /**
     * Demandes de liaison en attente
     */
    public static function pendingRequests() {
        $user = Auth::requireRole(['professional', 'admin']);
        
        $requests = db()->fetchAll(
            'SELECT ppl.id, ppl.requested_by, ppl.created_at,
                    u.id as patient_id, u.nom, u.prenom, u.email, u.avatar_url
             FROM professional_patient_links ppl
             JOIN users u ON ppl.patient_id = u.id
             WHERE ppl.professional_id = ? AND ppl.status = "pending"
             ORDER BY ppl.created_at DESC',
            [$user['id']]
        );
        
        Response::success(['requests' => $requests]);
    }
    
    /**
     * Accepter ou rejeter une demande de liaison
     */
    public static function handleLinkRequest($linkId) {
        $user = Auth::requireRole(['professional', 'admin']);
        $data = getRequestBody();
        
        $link = db()->fetchOne(
            'SELECT * FROM professional_patient_links WHERE id = ? AND professional_id = ? AND status = "pending"',
            [$linkId, $user['id']]
        );
        
        if (!$link) {
            Response::notFound('Demande non trouvee');
        }
        
        $action = $data['action'] ?? 'accept';
        $newStatus = $action === 'accept' ? 'active' : 'rejected';
        
        db()->update('professional_patient_links', [
            'status' => $newStatus,
            'accepted_at' => $action === 'accept' ? date('Y-m-d H:i:s') : null
        ], 'id = ?', [$linkId]);
        
        // Notifier le patient
        if ($action === 'accept') {
            db()->insert('notifications', [
                'user_id' => $link['patient_id'],
                'type' => 'info',
                'titre' => 'Demande acceptee',
                'message' => 'Votre demande de suivi professionnel a ete acceptee.',
                'link' => '/profile'
            ]);
        }
        
        Response::success(['message' => $action === 'accept' ? 'Liaison acceptee' : 'Liaison refusee']);
    }
    
    /**
     * Inviter un patient
     */
    public static function invitePatient() {
        $user = Auth::requireRole(['professional', 'admin']);
        $data = getRequestBody();
        
        $validator = new Validator($data);
        $validator->required('email')->email('email');
        $validator->validate();
        
        // Trouver le patient
        $patient = db()->fetchOne(
            'SELECT id, nom, email FROM users WHERE email = ? AND role = "user"',
            [$data['email']]
        );
        
        if (!$patient) {
            Response::error('Aucun patient trouve avec cet email', 404);
        }
        
        // Verifier si lien existe deja
        $existing = db()->fetchOne(
            'SELECT id, status FROM professional_patient_links WHERE professional_id = ? AND patient_id = ?',
            [$user['id'], $patient['id']]
        );
        
        if ($existing) {
            if ($existing['status'] === 'active') {
                Response::error('Ce patient est deja lie a votre compte', 400);
            }
            // Reactiver si rejete ou termine
            db()->update('professional_patient_links', [
                'status' => 'pending',
                'requested_by' => 'professional',
                'created_at' => date('Y-m-d H:i:s')
            ], 'id = ?', [$existing['id']]);
        } else {
            db()->insert('professional_patient_links', [
                'professional_id' => $user['id'],
                'patient_id' => $patient['id'],
                'status' => 'pending',
                'requested_by' => 'professional'
            ]);
        }
        
        // Notifier le patient
        db()->insert('notifications', [
            'user_id' => $patient['id'],
            'type' => 'info',
            'titre' => 'Invitation professionnel',
            'message' => 'Un professionnel de sante souhaite suivre votre dossier.',
            'link' => '/profile'
        ]);
        
        Response::success(['message' => 'Invitation envoyee']);
    }
    
    /**
     * Voir le dossier d'un patient
     */
    public static function getPatientDossier($patientId) {
        $user = Auth::requireRole(['professional', 'admin']);
        
        // Verifier la liaison
        $link = db()->fetchOne(
            'SELECT id FROM professional_patient_links WHERE professional_id = ? AND patient_id = ? AND status = "active"',
            [$user['id'], $patientId]
        );
        
        if (!$link && $user['role'] !== 'admin') {
            Response::forbidden('Vous n\'avez pas acces a ce dossier');
        }
        
        // Infos patient
        $patient = db()->fetchOne(
            'SELECT id, nom, prenom, email, telephone, date_naissance, sexe, avatar_url, created_at
             FROM users WHERE id = ?',
            [$patientId]
        );
        
        if (!$patient) {
            Response::notFound('Patient non trouve');
        }
        
        // Analyses
        $analyses = db()->fetchAll(
            'SELECT uuid, pathologie_label, score_confiance, niveau_risque, status, date_analyse
             FROM analyses WHERE user_id = ? ORDER BY date_analyse DESC LIMIT 20',
            [$patientId]
        );
        
        // Traitements
        $treatments = db()->fetchAll(
            'SELECT tp.uuid, tp.titre, tp.status, tp.date_debut, tp.date_fin_prevue, p.nom as pathologie_nom,
                    (SELECT COUNT(*) FROM treatment_entries WHERE treatment_plan_id = tp.id) as total_entries
             FROM treatment_plans tp
             LEFT JOIN pathologies p ON tp.pathologie_id = p.id
             WHERE tp.user_id = ?
             ORDER BY tp.created_at DESC',
            [$patientId]
        );
        
        // Notes du professionnel
        $notes = db()->fetchAll(
            'SELECT uuid, type, titre, contenu, importance, created_at
             FROM professional_notes
             WHERE professional_id = ? AND user_id = ?
             ORDER BY created_at DESC',
            [$user['id'], $patientId]
        );
        
        Response::success([
            'patient' => $patient,
            'analyses' => $analyses,
            'treatments' => $treatments,
            'notes' => $notes
        ]);
    }
    
    /**
     * Ajouter une note professionnelle
     */
    public static function addNote() {
        $user = Auth::requireRole(['professional', 'admin']);
        $data = getRequestBody();
        
        $validator = new Validator($data);
        $validator->required('patient_id')
                  ->required('contenu')
                  ->in('type', ['diagnosis', 'recommendation', 'prescription', 'follow_up', 'general'])
                  ->in('importance', ['low', 'normal', 'high', 'urgent'])
                  ->in('visibilite', ['professional_only', 'shared_with_patient']);
        $validator->validate();
        
        $patientId = (int)$data['patient_id'];
        
        // Verifier la liaison
        $link = db()->fetchOne(
            'SELECT id FROM professional_patient_links WHERE professional_id = ? AND patient_id = ? AND status = "active"',
            [$user['id'], $patientId]
        );
        
        if (!$link && $user['role'] !== 'admin') {
            Response::forbidden('Vous n\'avez pas acces a ce patient');
        }
        
        $noteData = [
            'uuid' => generateUUID(),
            'professional_id' => $user['id'],
            'user_id' => $patientId,
            'type' => $data['type'] ?? 'general',
            'titre' => $data['titre'] ?? null,
            'contenu' => $data['contenu'],
            'visibilite' => $data['visibilite'] ?? 'shared_with_patient',
            'importance' => $data['importance'] ?? 'normal',
            'analysis_id' => $data['analysis_id'] ?? null,
            'treatment_plan_id' => $data['treatment_plan_id'] ?? null
        ];
        
        $noteId = db()->insert('professional_notes', $noteData);
        
        // Notifier le patient si partage
        if ($noteData['visibilite'] === 'shared_with_patient') {
            db()->insert('notifications', [
                'user_id' => $patientId,
                'type' => 'professional_note',
                'titre' => 'Nouvelle note medicale',
                'message' => 'Votre professionnel de sante a ajoute une note a votre dossier.',
                'link' => '/profile'
            ]);
        }
        
        Response::created(['id' => $noteId, 'uuid' => $noteData['uuid']], 'Note ajoutee');
    }
    
    /**
     * Modifier une note
     */
    public static function updateNote($noteId) {
        $user = Auth::requireRole(['professional', 'admin']);
        $data = getRequestBody();
        
        $note = db()->fetchOne(
            'SELECT * FROM professional_notes WHERE id = ? AND professional_id = ?',
            [$noteId, $user['id']]
        );
        
        if (!$note) {
            Response::notFound('Note non trouvee');
        }
        
        $updateData = [];
        if (isset($data['titre'])) $updateData['titre'] = $data['titre'];
        if (isset($data['contenu'])) $updateData['contenu'] = $data['contenu'];
        if (isset($data['type'])) $updateData['type'] = $data['type'];
        if (isset($data['importance'])) $updateData['importance'] = $data['importance'];
        if (isset($data['visibilite'])) $updateData['visibilite'] = $data['visibilite'];
        
        if (!empty($updateData)) {
            db()->update('professional_notes', $updateData, 'id = ?', [$noteId]);
        }
        
        Response::success(['message' => 'Note mise a jour']);
    }
    
    /**
     * Supprimer une note
     */
    public static function deleteNote($noteId) {
        $user = Auth::requireRole(['professional', 'admin']);
        
        $note = db()->fetchOne(
            'SELECT id FROM professional_notes WHERE id = ? AND professional_id = ?',
            [$noteId, $user['id']]
        );
        
        if (!$note) {
            Response::notFound('Note non trouvee');
        }
        
        db()->delete('professional_notes', 'id = ?', [$noteId]);
        
        Response::success(['message' => 'Note supprimee']);
    }
    
    /**
     * Superviser un traitement
     */
    public static function superviseTreatment($treatmentId) {
        $user = Auth::requireRole(['professional', 'admin']);
        
        $treatment = db()->fetchOne(
            'SELECT tp.*, u.id as patient_id
             FROM treatment_plans tp
             JOIN users u ON tp.user_id = u.id
             WHERE tp.id = ?',
            [$treatmentId]
        );
        
        if (!$treatment) {
            Response::notFound('Traitement non trouve');
        }
        
        // Verifier la liaison
        $link = db()->fetchOne(
            'SELECT id FROM professional_patient_links WHERE professional_id = ? AND patient_id = ? AND status = "active"',
            [$user['id'], $treatment['patient_id']]
        );
        
        if (!$link && $user['role'] !== 'admin') {
            Response::forbidden('Vous n\'avez pas acces a ce patient');
        }
        
        db()->update('treatment_plans', [
            'professional_id' => $user['id']
        ], 'id = ?', [$treatmentId]);
        
        // Notifier le patient
        db()->insert('notifications', [
            'user_id' => $treatment['patient_id'],
            'type' => 'info',
            'titre' => 'Suivi professionnel',
            'message' => 'Un professionnel supervise maintenant votre traitement.',
            'link' => '/treatments/' . $treatment['uuid']
        ]);
        
        Response::success(['message' => 'Vous supervisez maintenant ce traitement']);
    }
    
    /**
     * Ajouter une note au traitement
     */
    public static function addTreatmentNote($treatmentId) {
        $user = Auth::requireRole(['professional', 'admin']);
        $data = getRequestBody();
        
        $treatment = db()->fetchOne(
            'SELECT tp.*, tp.user_id as patient_id
             FROM treatment_plans tp
             WHERE tp.id = ? AND tp.professional_id = ?',
            [$treatmentId, $user['id']]
        );
        
        if (!$treatment && $user['role'] !== 'admin') {
            Response::forbidden('Vous ne supervisez pas ce traitement');
        }
        
        $validator = new Validator($data);
        $validator->required('note');
        $validator->validate();
        
        // Ajouter note au traitement
        $currentNotes = $treatment['notes_professionnel'] ?? '';
        $newNote = date('Y-m-d H:i') . ' - ' . $data['note'];
        $updatedNotes = $currentNotes ? $currentNotes . "\n\n" . $newNote : $newNote;
        
        db()->update('treatment_plans', [
            'notes_professionnel' => $updatedNotes
        ], 'id = ?', [$treatmentId]);
        
        // Aussi creer une note professionnelle
        db()->insert('professional_notes', [
            'uuid' => generateUUID(),
            'professional_id' => $user['id'],
            'user_id' => $treatment['patient_id'] ?? $treatment['user_id'],
            'treatment_plan_id' => $treatmentId,
            'type' => 'follow_up',
            'contenu' => $data['note'],
            'visibilite' => 'shared_with_patient'
        ]);
        
        Response::success(['message' => 'Note ajoutee au traitement']);
    }
}

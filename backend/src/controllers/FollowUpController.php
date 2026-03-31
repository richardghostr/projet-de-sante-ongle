<?php
/**
 * FollowUpController - manage follow-up requests (patient -> professional)
 */

require_once __DIR__ . '/../bootstrap.php';

class FollowUpController {
    /** POST /follow-up/request */
    public static function createRequest() {
        $user = Auth::requireRole(['user','admin','professional']);
        // Only patients should create requests (role user)
        if ($user['role'] !== 'user') {
            Response::forbidden('Seuls les patients peuvent envoyer des demandes');
        }

        $data = getRequestBody();
        $validator = new Validator($data);
        $validator->required('professional_id')->required('analysis_uuid');
        $validator->validate();

        $professionalId = (int)$data['professional_id'];
        $analysisUuid = $data['analysis_uuid'];
        $message = $data['message'] ?? null;

        // Verify professional exists and is approved
        $prof = db()->fetchOne(
            'SELECT u.id, pp.statut_validation FROM users u LEFT JOIN professional_profiles pp ON pp.user_id = u.id WHERE u.id = ? AND u.role = "professional"',
            [$professionalId]
        );

        if (!$prof || ($prof['statut_validation'] ?? 'pending') !== 'approved') {
            Response::error('Professionnel non trouve ou non approuve', 400);
        }

        // Find analysis id
        $analysis = db()->fetchOne('SELECT id, user_id FROM analyses WHERE uuid = ?', [$analysisUuid]);
        if (!$analysis) Response::notFound('Analyse non trouvee');
        if ($analysis['user_id'] != $user['id']) Response::forbidden('Vous ne possedez pas cette analyse');

        // Prevent duplicate: already linked
        $existingLink = db()->fetchOne('SELECT id FROM professional_patient_links WHERE professional_id = ? AND patient_id = ? AND status = "active"', [$professionalId, $user['id']]);
        if ($existingLink) {
            Response::error('Vous êtes déjà en relation avec ce professionnel', 400);
        }

        // Prevent duplicate pending request for same professional & analysis
        $existingPending = db()->fetchOne('SELECT id FROM follow_up_requests WHERE patient_id = ? AND professional_id = ? AND analysis_id = ? AND status = "pending"', [$user['id'], $professionalId, $analysis['id']]);
        if ($existingPending) {
            Response::error('Une demande est déjà en attente pour ce professionnel et cette analyse', 400);
        }

        // Insert request
        $uuid = generateUUID();
        $now = date('Y-m-d H:i:s');
        $insertId = db()->insert('follow_up_requests', [
            'uuid' => $uuid,
            'patient_id' => $user['id'],
            'professional_id' => $professionalId,
            'analysis_id' => $analysis['id'],
            'message' => $message,
            'status' => 'pending',
            'created_at' => $now
        ]);

        // Notify professional
        db()->insert('notifications', [
            'user_id' => $professionalId,
            'type' => 'follow_request',
            'titre' => 'Nouvelle demande de suivi',
            'message' => 'Un patient a demande un suivi pour une analyse.',
            'link' => '/professional/follow-requests'
        ]);

        Logger::info('FollowUp.createRequest', ['id' => $insertId, 'patient_id' => $user['id'], 'professional_id' => $professionalId]);

        Response::created(['id' => $insertId, 'uuid' => $uuid], 'Demande envoyee');
    }

    /** GET /professionals - list approved professionals with optional filters */
    public static function listProfessionals() {
        $user = Auth::requireRole(['user','admin','professional']);

        $q = $_GET['q'] ?? null;
        $specialite = $_GET['specialty'] ?? null;
        $sort = $_GET['sort'] ?? 'alpha';

        $params = [];
        $where = ' WHERE u.role = "professional" AND (pp.statut_validation = "approved") ';
        if ($specialite) {
            $where .= ' AND (pp.specialite LIKE ? OR pp.sous_specialite LIKE ?) ';
            $params[] = "%$specialite%"; $params[] = "%$specialite%";
        }
        if ($q) {
            $where .= ' AND (u.nom LIKE ? OR u.prenom LIKE ? OR pp.specialite LIKE ?) ';
            $params[] = "%$q%"; $params[] = "%$q%"; $params[] = "%$q%";
        }

        $order = ' ORDER BY u.nom ASC ';
        if ($sort === 'experience') $order = ' ORDER BY COALESCE(pp.experience,"") DESC ';
        if ($sort === 'recent') $order = ' ORDER BY u.created_at DESC ';

        $sql = 'SELECT u.id, u.nom, u.prenom, u.avatar_url, pp.specialite, pp.sous_specialite, pp.matricule_professionnel, pp.experience, pp.statut_validation
                FROM users u
                JOIN professional_profiles pp ON pp.user_id = u.id' . $where . $order . ' LIMIT 200';

        $list = db()->fetchAll($sql, $params);
        Response::success(['professionals' => $list]);
    }

    /** GET /professional/follow-requests - list for professional */
    public static function listForProfessional() {
        $user = Auth::requireRole(['professional','admin']);

        $rows = db()->fetchAll(
            'SELECT fr.id, fr.uuid, fr.patient_id, fr.professional_id, fr.analysis_id, fr.message, fr.status, fr.created_at,
                    u.nom as patient_nom, u.prenom as patient_prenom, a.uuid as analysis_uuid, a.pathologie_label
             FROM follow_up_requests fr
             JOIN users u ON u.id = fr.patient_id
             LEFT JOIN analyses a ON a.id = fr.analysis_id
             WHERE fr.professional_id = ?
             ORDER BY fr.created_at DESC',
            [$user['id']]
        );

        Response::success(['requests' => $rows]);
    }

    /** POST /professional/follow-requests/{id}/{action} - accept or reject */
    public static function handleRequestAction($id, $action) {
        $user = Auth::requireRole(['professional','admin']);
        $req = db()->fetchOne('SELECT * FROM follow_up_requests WHERE id = ? AND professional_id = ?', [$id, $user['id']]);
        if (!$req) Response::notFound('Demande non trouvee');
        if ($req['status'] !== 'pending') Response::error('Demande deja traitee', 400);

        if ($action === 'accept') {
            db()->update('follow_up_requests', ['status' => 'accepted', 'updated_at' => date('Y-m-d H:i:s')], 'id = ?', [$id]);

            // Create or update professional_patient_links to active
            $existing = db()->fetchOne('SELECT id, status FROM professional_patient_links WHERE professional_id = ? AND patient_id = ?', [$user['id'], $req['patient_id']]);
            if ($existing) {
                db()->update('professional_patient_links', ['status' => 'active', 'accepted_at' => date('Y-m-d H:i:s')], 'id = ?', [$existing['id']]);
            } else {
                db()->insert('professional_patient_links', [
                    'professional_id' => $user['id'],
                    'patient_id' => $req['patient_id'],
                    'status' => 'active',
                    'requested_by' => 'patient',
                    'accepted_at' => date('Y-m-d H:i:s')
                ]);
            }

            // Notify patient
            db()->insert('notifications', [
                'user_id' => $req['patient_id'],
                'type' => 'info',
                'titre' => 'Demande acceptee',
                'message' => 'Votre demande de suivi a ete acceptee par le professionnel.',
                'link' => '/profile'
            ]);

            Logger::info('FollowUp.accept', ['request_id' => $id, 'professional_id' => $user['id']]);
            Response::success(['message' => 'Demande acceptee']);
        }

        if ($action === 'reject') {
            db()->update('follow_up_requests', ['status' => 'rejected', 'updated_at' => date('Y-m-d H:i:s')], 'id = ?', [$id]);
            db()->insert('notifications', [
                'user_id' => $req['patient_id'],
                'type' => 'info',
                'titre' => 'Demande refusee',
                'message' => 'Votre demande de suivi a ete refusee par le professionnel.',
                'link' => '/profile'
            ]);
            Logger::info('FollowUp.reject', ['request_id' => $id, 'professional_id' => $user['id']]);
            Response::success(['message' => 'Demande refusee']);
        }

        Response::error('Action non supportee', 400);
    }

    public static function listForPatient() {
        $user = Auth::requireRole(['user','admin']);
        $rows = db()->fetchAll(
            'SELECT fr.id, fr.uuid, fr.professional_id, fr.analysis_id, fr.message, fr.status, fr.created_at,
                    u.nom as professional_nom, u.prenom as professional_prenom, pp.specialite
             FROM follow_up_requests fr
             JOIN users u ON u.id = fr.professional_id
             LEFT JOIN professional_profiles pp ON pp.user_id = u.id
             WHERE fr.patient_id = ?
             ORDER BY fr.created_at DESC',
            [$user['id']]
        );
        Response::success(['requests' => $rows]);
    }

    /** GET /patient/active-professionals - list professional_ids or details where patient has an active link */
    public static function listActiveForPatient() {
        $user = Auth::requireRole(['user','admin']);

        $rows = db()->fetchAll(
            'SELECT p.professional_id as id, u.nom, u.prenom, u.avatar_url, pp.specialite, pp.experience
             FROM professional_patient_links p
             JOIN users u ON u.id = p.professional_id
             LEFT JOIN professional_profiles pp ON pp.user_id = u.id
             WHERE p.patient_id = ? AND p.status = "active"
             ORDER BY p.accepted_at DESC',
            [$user['id']]
        );

        Response::success(['professionals' => $rows]);
    }

    public static function listForAdmin() {
        $user = Auth::requireRole(['admin']);
        $rows = db()->fetchAll(
            'SELECT fr.*, pu.nom as patient_nom, pro.nom as professional_nom
             FROM follow_up_requests fr
             JOIN users pu ON pu.id = fr.patient_id
             JOIN users pro ON pro.id = fr.professional_id
             ORDER BY fr.created_at DESC'
        );
        Response::success(['requests' => $rows]);
    }
}

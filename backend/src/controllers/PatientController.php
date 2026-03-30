<?php
/**
 * UNGUEALHEALTH - Patient Controller
 * Gestion des invitations de suivi (côté patient)
 */

require_once __DIR__ . '/../bootstrap.php';

class PatientController {

    /**
     * GET /api/patient/invitations - lister les invitations entrantes
     */
    public static function listInvitations() {
        $user = Auth::requireRole(['user', 'admin']);

        $invitations = db()->fetchAll(
            'SELECT ppl.id as link_id, ppl.professional_id, ppl.status as link_status, ppl.requested_by, ppl.created_at,
                    u.nom as professional_nom, u.prenom as professional_prenom, u.email as professional_email, u.avatar_url as professional_avatar
             FROM professional_patient_links ppl
             JOIN users u ON ppl.professional_id = u.id
             WHERE ppl.patient_id = ? AND ppl.status = "pending"
             ORDER BY ppl.created_at DESC',
            [$user['id']]
        );

        Response::success(['invitations' => $invitations]);
    }

    /**
     * PUT /api/patient/invitations/{id} - repondre (accept|reject)
     */
    public static function respondInvitation($linkId) {
        $user = Auth::requireRole(['user', 'admin']);
        $data = getRequestBody();

        Logger::info('Patient.respondInvitation called', ['user_id' => $user['id'] ?? null, 'linkId' => $linkId, 'body' => $data]);

        $link = db()->fetchOne(
            'SELECT * FROM professional_patient_links WHERE id = ? AND patient_id = ? AND status = "pending"',
            [$linkId, $user['id']]
        );

        if (!$link) {
            Logger::warning('Invitation not found for respondInvitation', ['user_id' => $user['id'] ?? null, 'linkId' => $linkId]);
            Response::notFound('Invitation non trouvee');
        }

        $action = $data['action'] ?? 'accept';
        $newStatus = $action === 'accept' ? 'active' : 'rejected';

        db()->update('professional_patient_links', [
            'status' => $newStatus,
            'accepted_at' => $action === 'accept' ? date('Y-m-d H:i:s') : null
        ], 'id = ?', [$linkId]);

        // Notifier le professionnel
        db()->insert('notifications', [
            'user_id' => $link['professional_id'],
            'type' => 'info',
            'titre' => $action === 'accept' ? 'Invitation acceptée' : 'Invitation refusée',
            'message' => ($user['prenom'] ?? $user['nom'] ?? 'Un patient') . ' a ' . ($action === 'accept' ? 'accepté' : 'refusé') . ' votre invitation de suivi.',
            'link' => '/professional/patients'
        ]);

        Response::success(['message' => $action === 'accept' ? 'Invitation acceptée' : 'Invitation refusée']);
    }

    /**
     * POST /api/patient/notes/{noteId}/read - marquer une note professionnelle comme lue
     */
    public static function markNoteRead($noteId) {
        $user = Auth::requireRole(['user', 'admin']);

        // Verifier que la note existe et appartient au patient
        $note = db()->fetchOne(
            'SELECT id, user_id FROM professional_notes WHERE id = ? AND user_id = ?',
            [$noteId, $user['id']]
        );

        if (!$note) {
            Response::notFound('Note non trouvee');
        }

        try {
            // Tenter de mettre a jour read_at (ajouter la colonne si necessaire)
            db()->update('professional_notes', ['read_at' => date('Y-m-d H:i:s')], 'id = ?', [$noteId]);
        } catch (Exception $ex) {
            // Si la colonne n'existe pas, on la cree puis on retry
            Logger::warning('markNoteRead: update failed, attempting to alter table', ['error' => $ex->getMessage()]);
            try {
                db()->exec("ALTER TABLE professional_notes ADD COLUMN `read_at` TIMESTAMP NULL AFTER `updated_at`");
                db()->update('professional_notes', ['read_at' => date('Y-m-d H:i:s')], 'id = ?', [$noteId]);
            } catch (Exception $e2) {
                Logger::error('markNoteRead: failed to add read_at column', ['error' => $e2->getMessage()]);
                Response::serverError('Impossible de marquer la note comme lue');
            }
        }

        Response::success(['message' => 'Note marquee comme lue']);
    }

    /**
     * GET /api/patient/notes - lister toutes les notes professionnelles visibles par le patient
     */
    public static function listNotes() {
        $user = Auth::requireRole(['user', 'admin']);

        $notes = db()->fetchAll(
            "SELECT pn.id, pn.uuid, pn.type, pn.titre, pn.contenu, pn.importance, pn.created_at, pn.read_at,
                    pn.analysis_id, pn.treatment_plan_id,
                    t.uuid as treatment_uuid,
                    a.uuid as analysis_uuid,
                    u.nom as professional_nom, u.prenom as professional_prenom
             FROM professional_notes pn
             LEFT JOIN treatment_plans t ON pn.treatment_plan_id = t.id
             LEFT JOIN analyses a ON pn.analysis_id = a.id
             JOIN users u ON pn.professional_id = u.id
             WHERE pn.user_id = ? AND pn.visibilite = 'shared_with_patient'
             ORDER BY pn.created_at DESC",
            [$user['id']]
        );

        Response::success(['notes' => $notes]);
    }
}

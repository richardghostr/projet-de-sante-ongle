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
        try {
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
        } catch (Exception $ex) {
            // If the column `read_at` does not exist (old DB), create it and retry
            if (strpos($ex->getMessage(), 'Unknown column') !== false || strpos($ex->getMessage(), '1054') !== false) {
                Logger::warning('listNotes: missing read_at column, attempting to add it', ['error' => $ex->getMessage()]);
                try {
                    db()->exec("ALTER TABLE professional_notes ADD COLUMN `read_at` TIMESTAMP NULL AFTER `updated_at`");
                } catch (Exception $e2) {
                    Logger::error('listNotes: failed to add read_at column', ['error' => $e2->getMessage()]);
                    Response::serverError('Erreur lors de la recuperation des notes');
                }

                // retry query
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
            } else {
                Logger::error('listNotes: query failed', ['error' => $ex->getMessage()]);
                Response::serverError('Impossible de recuperer les notes');
            }
        }

        Logger::info('Patient.listNotes result', ['user_id' => $user['id'], 'count' => count($notes)]);
        Response::success(['notes' => $notes]);
    }

    /**
     * POST /api/patient/messages - envoyer un message depuis le patient vers son professionnel
     * body: { message: string, analysis_uuid?: string }
     */
    public static function sendMessage() {
        $user = Auth::requireRole(['user', 'admin']);
        $body = getRequestBody();
        $message = trim($body['message'] ?? '');
        $analysisUuid = $body['analysis_uuid'] ?? null;

        if (!$message) {
            Response::badRequest('Message vide');
        }

        // Trouver le professionnel lie au patient (lien actif)
        $link = db()->fetchOne('SELECT professional_id FROM professional_patient_links WHERE patient_id = ? AND status = "active" LIMIT 1', [$user['id']]);
        if (!$link || empty($link['professional_id'])) {
            Response::forbidden('Aucun professionnel lie a ce patient');
        }
        $professionalId = $link['professional_id'];

        $pdo = get_db();

        try {
            // Si un analysis_uuid est fourni, resoudre l'ID de l'analyse
            $analysisId = null;
            if ($analysisUuid) {
                $a = db()->fetchOne('SELECT id FROM analyses WHERE uuid = ? LIMIT 1', [$analysisUuid]);
                if ($a) $analysisId = $a['id'];
            }

            // Inserer comme note professionnelle visible uniquement par le professionnel
            $noteData = [
                'uuid' => generateUUID(),
                'professional_id' => $professionalId,
                'user_id' => $user['id'],
                'analysis_id' => $analysisId,
                'treatment_plan_id' => null,
                'type' => 'general',
                'titre' => null,
                'contenu' => $message,
                'visibilite' => 'professional_only',
                'importance' => 'normal',
            ];

            $noteId = db()->insert('professional_notes', $noteData);

            // Notifier le professionnel
            db()->insert('notifications', [
                'user_id' => $professionalId,
                'type' => 'professional_note',
                'titre' => 'Nouveau message patient',
                'message' => substr($message, 0, 200),
                'link' => '/professional/patients'
            ]);

            Logger::info('Patient.sendMessage inserted', ['note_id' => $noteId, 'patient_id' => $user['id'], 'professional_id' => $professionalId, 'analysis_id' => $analysisId]);

            Response::success(['note_id' => $noteId]);
        } catch (Exception $ex) {
            Logger::error('Patient.sendMessage failed', ['error' => $ex->getMessage()]);
            Response::serverError('Impossible d\'envoyer le message');
        }
    }
}

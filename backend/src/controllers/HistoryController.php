<?php
/**
 * UNGUEALHEALTH - HistoryController
 * Gestion de l'historique des analyses
 */

class HistoryController {
    
    /**
     * GET /api/history - Liste des analyses de l'utilisateur
     */
    public static function index() {
        $user = Auth::getCurrentUser();
        $userId = $user ? $user['id'] : null;
        
        // Parametres de pagination et filtrage
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = min(50, max(1, (int)($_GET['limit'] ?? 20)));
        $offset = ($page - 1) * $limit;
        
        $status = $_GET['status'] ?? null;
        $niveauRisque = $_GET['niveau_risque'] ?? null;
        $dateFrom = $_GET['date_from'] ?? null;
        $dateTo = $_GET['date_to'] ?? null;
        $sort = $_GET['sort'] ?? 'date_analyse';
        $order = strtoupper($_GET['order'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';
        
        $pdo = get_db();
        
        if ($pdo && $userId) {
            // Construction de la requete
            $where = ['user_id = ?'];
            $params = [$userId];
            
            if ($status) {
                $where[] = 'status = ?';
                $params[] = $status;
            }
            if ($niveauRisque) {
                $where[] = 'niveau_risque = ?';
                $params[] = $niveauRisque;
            }
            if ($dateFrom) {
                $where[] = 'date_analyse >= ?';
                $params[] = $dateFrom;
            }
            if ($dateTo) {
                $where[] = 'date_analyse <= ?';
                $params[] = $dateTo . ' 23:59:59';
            }
            
            $whereClause = implode(' AND ', $where);
            
            // Compter le total
            $countResult = db()->fetchOne("SELECT COUNT(*) as total FROM analyses WHERE $whereClause", $params);
            $total = (int)($countResult['total'] ?? 0);
            
            // Valider le tri
            $allowedSort = ['date_analyse', 'score_confiance', 'niveau_risque', 'pathologie_label'];
            if (!in_array($sort, $allowedSort)) $sort = 'date_analyse';
            
            // Recuperer les analyses
            $sql = "SELECT id, uuid, image_path, thumbnail_path, pathologie_label, 
                           score_confiance, niveau_risque, status, date_analyse, completed_at,
                           doigt_concerne, main_pied, model_version
                    FROM analyses 
                    WHERE $whereClause 
                    ORDER BY $sort $order 
                    LIMIT $limit OFFSET $offset";
            
            $analyses = db()->fetchAll($sql, $params);
            
        } else {
            // Fallback fichier - sans authentification ou sans DB
            $analysesFile = __DIR__ . '/../../storage/data/analyses.json';
            $allAnalyses = [];
            
            if (file_exists($analysesFile)) {
                $allAnalyses = json_decode(file_get_contents($analysesFile), true) ?: [];
            }
            
            // Filtrer par user si connecte
            if ($userId) {
                $allAnalyses = array_filter($allAnalyses, fn($a) => ($a['user_id'] ?? null) == $userId);
            }
            
            // Appliquer les filtres
            if ($status) {
                $allAnalyses = array_filter($allAnalyses, fn($a) => ($a['status'] ?? '') === $status);
            }
            if ($niveauRisque) {
                $allAnalyses = array_filter($allAnalyses, fn($a) => ($a['niveau_risque'] ?? '') === $niveauRisque);
            }
            if ($dateFrom) {
                $allAnalyses = array_filter($allAnalyses, fn($a) => ($a['date_analyse'] ?? '') >= $dateFrom);
            }
            if ($dateTo) {
                $allAnalyses = array_filter($allAnalyses, fn($a) => substr($a['date_analyse'] ?? '', 0, 10) <= $dateTo);
            }
            
            // Reindexer
            $allAnalyses = array_values($allAnalyses);
            
            // Trier
            usort($allAnalyses, function($a, $b) use ($sort, $order) {
                $valA = $a[$sort] ?? '';
                $valB = $b[$sort] ?? '';
                $cmp = $valA <=> $valB;
                return $order === 'DESC' ? -$cmp : $cmp;
            });
            
            $total = count($allAnalyses);
            $analyses = array_slice($allAnalyses, $offset, $limit);
        }
        
        // Formater les resultats
        $formattedAnalyses = array_map(function($a) {
            return [
                'id' => $a['id'] ?? $a['uuid'],
                'uuid' => $a['uuid'] ?? $a['id'],
                'image_url' => $a['image_path'] ?? null,
                'thumbnail_url' => $a['thumbnail_path'] ?? null,
                'pathologie' => $a['pathologie_label'] ?? null,
                'score_confiance' => isset($a['score_confiance']) ? round((float)$a['score_confiance'], 2) : null,
                'niveau_risque' => $a['niveau_risque'] ?? null,
                'status' => $a['status'] ?? 'unknown',
                'doigt_concerne' => $a['doigt_concerne'] ?? null,
                'main_pied' => $a['main_pied'] ?? null,
                'date_analyse' => $a['date_analyse'] ?? null,
                'completed_at' => $a['completed_at'] ?? null,
            ];
        }, $analyses);
        
        Response::success([
            'analyses' => $formattedAnalyses,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'total_pages' => ceil($total / $limit),
                'has_more' => ($page * $limit) < $total
            ],
            'filters' => [
                'status' => $status,
                'niveau_risque' => $niveauRisque,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'sort' => $sort,
                'order' => $order
            ]
        ]);
    }
    
    /**
     * GET /api/history/:id - Detail d'une analyse
     */
    public static function show($id) {
        $user = Auth::getCurrentUser();
        
        // Recuperer l'analyse
        $analysis = self::getAnalysisById($id);
        
        if (!$analysis) {
            Response::notFound('Analyse non trouvee');
        }
        
        // Verifier l'acces
        if ($user && $analysis['user_id'] && $analysis['user_id'] != $user['id']) {
            if (!isset($user['role']) || $user['role'] !== 'admin') {
                Response::forbidden('Acces non autorise');
            }
        }
        
        // Recuperer les conseils
        $conseils = self::getConseils($analysis['id'] ?? $id);
        
        // Recuperer les infos de la pathologie si disponible
        $pathologieInfo = null;
        if (isset($analysis['pathologie_detectee_id'])) {
            $pathologieInfo = self::getPathologieInfo($analysis['pathologie_detectee_id']);
        }
        
        Response::success([
            'analysis' => [
                'id' => $analysis['id'] ?? $analysis['uuid'],
                'uuid' => $analysis['uuid'] ?? $analysis['id'],
                'image_url' => $analysis['image_path'],
                'thumbnail_url' => $analysis['thumbnail_path'] ?? null,
                'image_original_name' => $analysis['image_original_name'] ?? null,
                'status' => $analysis['status'],
                'pathologie' => $analysis['pathologie_label'],
                'score_confiance' => isset($analysis['score_confiance']) ? round((float)$analysis['score_confiance'], 4) : null,
                'niveau_risque' => $analysis['niveau_risque'],
                'recommandation_consultation' => (bool)($analysis['recommandation_consultation'] ?? false),
                'result' => isset($analysis['result_json']) ? json_decode($analysis['result_json'], true) : null,
                'heatmap_url' => $analysis['heatmap_path'] ?? null,
                'doigt_concerne' => $analysis['doigt_concerne'] ?? null,
                'main_pied' => $analysis['main_pied'] ?? null,
                'notes' => $analysis['notes_utilisateur'] ?? null,
                'model_version' => $analysis['model_version'] ?? null,
                'processing_time_ms' => $analysis['processing_time_ms'] ?? null,
                'date_analyse' => $analysis['date_analyse'],
                'completed_at' => $analysis['completed_at'] ?? null,
            ],
            'pathologie_info' => $pathologieInfo,
            'conseils' => $conseils
        ]);
    }
    
    /**
     * DELETE /api/history/:id - Supprimer une analyse
     */
    public static function delete($id) {
        $user = Auth::requireAuth();
        
        $analysis = self::getAnalysisById($id);
        
        if (!$analysis) {
            Response::notFound('Analyse non trouvee');
        }
        
        // Verifier l'acces
        if ($analysis['user_id'] != $user['id'] && $user['role'] !== 'admin') {
            Response::forbidden('Acces non autorise');
        }
        
        // Supprimer les fichiers
        if (!empty($analysis['image_path'])) {
            $imagePath = __DIR__ . '/../..' . $analysis['image_path'];
            if (file_exists($imagePath)) {
                unlink($imagePath);
            }
        }
        if (!empty($analysis['thumbnail_path'])) {
            $thumbPath = __DIR__ . '/../..' . $analysis['thumbnail_path'];
            if (file_exists($thumbPath)) {
                unlink($thumbPath);
            }
        }
        if (!empty($analysis['heatmap_path'])) {
            $heatmapPath = __DIR__ . '/../..' . $analysis['heatmap_path'];
            if (file_exists($heatmapPath)) {
                unlink($heatmapPath);
            }
        }
        
        // Supprimer en base ou fichier
        $pdo = get_db();
        if ($pdo && is_numeric($analysis['id'])) {
            db()->delete('conseils', 'analysis_id = ?', [$analysis['id']]);
            db()->delete('analyses', 'id = ?', [$analysis['id']]);
        } else {
            // Fallback fichier
            $analysesFile = __DIR__ . '/../../storage/data/analyses.json';
            if (file_exists($analysesFile)) {
                $analyses = json_decode(file_get_contents($analysesFile), true) ?: [];
                $analyses = array_filter($analyses, function($a) use ($id) {
                    return ($a['id'] ?? '') != $id && ($a['uuid'] ?? '') != $id;
                });
                file_put_contents($analysesFile, json_encode(array_values($analyses), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            }
        }
        
        Logger::info('Analysis deleted', ['id' => $id, 'user_id' => $user['id']]);
        
        Response::success(null, 'Analyse supprimee');
    }
    
    /**
     * GET /api/history/stats - Statistiques de l'utilisateur
     */
    public static function stats() {
        $user = Auth::requireAuth();
        
        $stats = [
            'total_analyses' => 0,
            'analyses_ce_mois' => 0,
            'par_niveau_risque' => [
                'sain' => 0,
                'bas' => 0,
                'modere' => 0,
                'eleve' => 0,
                'critique' => 0
            ],
            'par_pathologie' => [],
            'evolution_mensuelle' => [],
            'derniere_analyse' => null
        ];
        
        $pdo = get_db();
        
        if ($pdo) {
            // Total analyses
            $result = db()->fetchOne('SELECT COUNT(*) as total FROM analyses WHERE user_id = ?', [$user['id']]);
            $stats['total_analyses'] = (int)($result['total'] ?? 0);
            
            // Ce mois
            $result = db()->fetchOne(
                'SELECT COUNT(*) as total FROM analyses WHERE user_id = ? AND date_analyse >= DATE_FORMAT(NOW(), "%Y-%m-01")',
                [$user['id']]
            );
            $stats['analyses_ce_mois'] = (int)($result['total'] ?? 0);
            
            // Par niveau de risque
            $risques = db()->fetchAll(
                'SELECT niveau_risque, COUNT(*) as count FROM analyses WHERE user_id = ? AND status = "completed" GROUP BY niveau_risque',
                [$user['id']]
            );
            foreach ($risques as $r) {
                if (isset($stats['par_niveau_risque'][$r['niveau_risque']])) {
                    $stats['par_niveau_risque'][$r['niveau_risque']] = (int)$r['count'];
                }
            }
            
            // Par pathologie
            $pathologies = db()->fetchAll(
                'SELECT pathologie_label, COUNT(*) as count FROM analyses WHERE user_id = ? AND status = "completed" AND pathologie_label IS NOT NULL GROUP BY pathologie_label ORDER BY count DESC LIMIT 10',
                [$user['id']]
            );
            $stats['par_pathologie'] = $pathologies;
            
            // Evolution mensuelle (6 derniers mois)
            $evolution = db()->fetchAll(
                'SELECT DATE_FORMAT(date_analyse, "%Y-%m") as mois, COUNT(*) as count 
                 FROM analyses WHERE user_id = ? AND date_analyse >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                 GROUP BY mois ORDER BY mois',
                [$user['id']]
            );
            $stats['evolution_mensuelle'] = $evolution;
            
            // Derniere analyse
            $derniere = db()->fetchOne(
                'SELECT date_analyse, pathologie_label, niveau_risque FROM analyses WHERE user_id = ? ORDER BY date_analyse DESC LIMIT 1',
                [$user['id']]
            );
            $stats['derniere_analyse'] = $derniere;
            
        } else {
            // Fallback fichier
            $analysesFile = __DIR__ . '/../../storage/data/analyses.json';
            if (file_exists($analysesFile)) {
                $analyses = json_decode(file_get_contents($analysesFile), true) ?: [];
                $userAnalyses = array_filter($analyses, fn($a) => ($a['user_id'] ?? null) == $user['id']);
                
                $stats['total_analyses'] = count($userAnalyses);
                $thisMonth = date('Y-m');
                
                foreach ($userAnalyses as $a) {
                    // Ce mois
                    if (substr($a['date_analyse'] ?? '', 0, 7) === $thisMonth) {
                        $stats['analyses_ce_mois']++;
                    }
                    
                    // Par niveau de risque
                    $risque = $a['niveau_risque'] ?? 'bas';
                    if (isset($stats['par_niveau_risque'][$risque])) {
                        $stats['par_niveau_risque'][$risque]++;
                    }
                    
                    // Par pathologie
                    if (!empty($a['pathologie_label'])) {
                        $label = $a['pathologie_label'];
                        if (!isset($stats['par_pathologie'][$label])) {
                            $stats['par_pathologie'][$label] = 0;
                        }
                        $stats['par_pathologie'][$label]++;
                    }
                }
                
                // Formater par_pathologie
                $pathoArray = [];
                foreach ($stats['par_pathologie'] as $label => $count) {
                    $pathoArray[] = ['pathologie_label' => $label, 'count' => $count];
                }
                usort($pathoArray, fn($a, $b) => $b['count'] - $a['count']);
                $stats['par_pathologie'] = array_slice($pathoArray, 0, 10);
                
                // Derniere analyse
                usort($userAnalyses, fn($a, $b) => ($b['date_analyse'] ?? '') <=> ($a['date_analyse'] ?? ''));
                if (!empty($userAnalyses)) {
                    $last = $userAnalyses[0];
                    $stats['derniere_analyse'] = [
                        'date_analyse' => $last['date_analyse'] ?? null,
                        'pathologie_label' => $last['pathologie_label'] ?? null,
                        'niveau_risque' => $last['niveau_risque'] ?? null
                    ];
                }
            }
        }
        
        Response::success($stats);
    }

    /**
     * GET /api/history/export?format=json|csv - Exporter l'historique de l'utilisateur
     */
    public static function export() {
        $user = Auth::requireAuth();
        $format = strtolower($_GET['format'] ?? 'json');

        $pdo = get_db();
        $records = [];

        if ($pdo) {
            $rows = db()->fetchAll('SELECT id, uuid, image_path, pathologie_label, score_confiance, niveau_risque, date_analyse FROM analyses WHERE user_id = ? ORDER BY date_analyse DESC', [$user['id']]);
            $records = $rows ?: [];
        } else {
            $analysesFile = __DIR__ . '/../../storage/data/analyses.json';
            if (file_exists($analysesFile)) {
                $all = json_decode(file_get_contents($analysesFile), true) ?: [];
                $records = array_values(array_filter($all, fn($a) => ($a['user_id'] ?? null) == $user['id']));
            }
        }

        if ($format === 'csv') {
            // Build CSV
            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="unguealhealth_history_' . date('Ymd') . '.csv"');
            $out = fopen('php://output', 'w');
            fputcsv($out, ['id','uuid','image_path','pathologie_label','score_confiance','niveau_risque','date_analyse']);
            foreach ($records as $r) {
                fputcsv($out, [
                    $r['id'] ?? '',
                    $r['uuid'] ?? '',
                    $r['image_path'] ?? '',
                    $r['pathologie_label'] ?? '',
                    $r['score_confiance'] ?? '',
                    $r['niveau_risque'] ?? '',
                    $r['date_analyse'] ?? ''
                ]);
            }
            exit;
        }

        // Default JSON
        Response::success(['records' => $records]);
    }
    
    // ============================================
    // Private Helpers
    // ============================================
    
    private static function getAnalysisById($id) {
        $pdo = get_db();
        if ($pdo) {
            return db()->fetchOne('SELECT * FROM analyses WHERE id = ? OR uuid = ?', [$id, $id]);
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
    
    private static function getConseils($analysisId) {
        $pdo = get_db();
        if ($pdo && is_numeric($analysisId)) {
            return db()->fetchAll(
                'SELECT type_conseil as type, titre, texte_conseil as texte, priorite, source FROM conseils WHERE analysis_id = ? ORDER BY priorite',
                [$analysisId]
            );
        }
        return [];
    }
    
    private static function getPathologieInfo($pathologieId) {
        $pdo = get_db();
        if (!$pdo) return null;
        
        return db()->fetchOne(
            'SELECT code, nom, nom_scientifique, description, symptomes, causes, niveau_gravite, contagieux FROM pathologies WHERE id = ?',
            [$pathologieId]
        );
    }
}

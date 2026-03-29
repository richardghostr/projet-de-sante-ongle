-- ============================================
-- UNGUEALHEALTH - Schema MySQL Complet
-- Version: 2.1 (avec RBAC et Suivi Traitement)
-- ============================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- Table: users (Utilisateurs)
-- ============================================
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `nom` VARCHAR(150) NOT NULL,
  `prenom` VARCHAR(150) DEFAULT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `telephone` VARCHAR(20) DEFAULT NULL,
  `date_naissance` DATE DEFAULT NULL,
  `sexe` ENUM('homme', 'femme', 'autre') DEFAULT NULL,
  `avatar_url` VARCHAR(512) DEFAULT NULL,
  `role` ENUM('user', 'student', 'professional', 'admin') DEFAULT 'user',
  `specialite` VARCHAR(255) DEFAULT NULL COMMENT 'Pour les professionnels',
  `numero_ordre` VARCHAR(100) DEFAULT NULL COMMENT 'Numero ordre medical pour professionnels',
  `etablissement` VARCHAR(255) DEFAULT NULL COMMENT 'Etablissement pour etudiants/professionnels',
  `consent_data` TINYINT(1) DEFAULT 0,
  `consent_date` TIMESTAMP NULL,
  `email_verified` TINYINT(1) DEFAULT 0,
  `email_verified_at` TIMESTAMP NULL,
  `last_login` TIMESTAMP NULL,
  `login_count` INT UNSIGNED DEFAULT 0,
  `status` ENUM('active', 'inactive', 'suspended', 'deleted', 'pending_verification') DEFAULT 'active',
  `preferences` JSON DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_email` (`email`),
  INDEX `idx_role` (`role`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: sessions (Gestion des sessions JWT)
-- ============================================
DROP TABLE IF EXISTS `sessions`;
CREATE TABLE `sessions` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `token_hash` VARCHAR(255) NOT NULL UNIQUE,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `user_agent` VARCHAR(512) DEFAULT NULL,
  `expires_at` TIMESTAMP NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `last_activity` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_token` (`token_hash`),
  INDEX `idx_expires` (`expires_at`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: pathologies (Catalogue des pathologies)
-- ============================================
DROP TABLE IF EXISTS `pathologies`;
CREATE TABLE `pathologies` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `nom` VARCHAR(255) NOT NULL,
  `nom_scientifique` VARCHAR(255) DEFAULT NULL,
  `description` TEXT,
  `symptomes` TEXT,
  `causes` TEXT,
  `niveau_gravite` ENUM('faible', 'modere', 'eleve', 'critique') DEFAULT 'modere',
  `contagieux` TINYINT(1) DEFAULT 0,
  `image_reference` VARCHAR(512) DEFAULT NULL,
  `sources_medicales` JSON DEFAULT NULL,
  `active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_code` (`code`),
  INDEX `idx_gravite` (`niveau_gravite`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: analyses (Analyses d'images)
-- ============================================
DROP TABLE IF EXISTS `analyses`;
CREATE TABLE `analyses` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `user_id` BIGINT UNSIGNED NULL,
  `image_path` VARCHAR(512) NOT NULL,
  `image_original_name` VARCHAR(255) DEFAULT NULL,
  `image_size` INT UNSIGNED DEFAULT NULL,
  `image_mime_type` VARCHAR(100) DEFAULT NULL,
  `thumbnail_path` VARCHAR(512) DEFAULT NULL,
  `doigt_concerne` ENUM('pouce', 'index', 'majeur', 'annulaire', 'auriculaire', 'orteil') DEFAULT NULL,
  `main_pied` ENUM('main_gauche', 'main_droite', 'pied_gauche', 'pied_droit') DEFAULT NULL,
  `result_json` JSON DEFAULT NULL,
  `pathologie_detectee_id` BIGINT UNSIGNED DEFAULT NULL,
  `pathologie_label` VARCHAR(255) DEFAULT NULL,
  `score_confiance` DECIMAL(5,4) DEFAULT NULL,
  `niveau_risque` ENUM('sain', 'bas', 'modere', 'eleve', 'critique') DEFAULT 'bas',
  `recommandation_consultation` TINYINT(1) DEFAULT 0,
  `model_version` VARCHAR(64) DEFAULT NULL,
  `processing_time_ms` INT UNSIGNED DEFAULT NULL,
  `heatmap_path` VARCHAR(512) DEFAULT NULL,
  `segmentation_path` VARCHAR(512) DEFAULT NULL,
  `status` ENUM('pending', 'processing', 'completed', 'failed', 'archived') DEFAULT 'pending',
  `error_message` TEXT DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `user_agent` VARCHAR(512) DEFAULT NULL,
  `notes_utilisateur` TEXT DEFAULT NULL,
  `date_analyse` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `completed_at` TIMESTAMP NULL,
  INDEX `idx_uuid` (`uuid`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_niveau_risque` (`niveau_risque`),
  INDEX `idx_date` (`date_analyse`),
  INDEX `idx_pathologie` (`pathologie_detectee_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`pathologie_detectee_id`) REFERENCES `pathologies`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: treatment_plans (Plans de traitement)
-- ============================================
DROP TABLE IF EXISTS `treatment_plans`;
CREATE TABLE `treatment_plans` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `analysis_id` BIGINT UNSIGNED NULL COMMENT 'Analyse initiale liee',
  `pathologie_id` BIGINT UNSIGNED NULL,
  `titre` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `doigt_concerne` ENUM('pouce', 'index', 'majeur', 'annulaire', 'auriculaire', 'orteil') DEFAULT NULL,
  `main_pied` ENUM('main_gauche', 'main_droite', 'pied_gauche', 'pied_droit') DEFAULT NULL,
  `date_debut` DATE NOT NULL,
  `date_fin_prevue` DATE DEFAULT NULL,
  `date_fin_reelle` DATE DEFAULT NULL,
  `status` ENUM('active', 'paused', 'completed', 'abandoned') DEFAULT 'active',
  `objectif` TEXT COMMENT 'Objectif du traitement',
  `traitement_prescrit` TEXT COMMENT 'Medicaments, soins prescrits',
  `frequence_suivi` ENUM('daily', 'every_2_days', 'weekly', 'biweekly', 'monthly') DEFAULT 'weekly',
  `rappel_actif` TINYINT(1) DEFAULT 1,
  `professional_id` BIGINT UNSIGNED NULL COMMENT 'Professionnel qui supervise',
  `notes_professionnel` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_uuid` (`uuid`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_dates` (`date_debut`, `date_fin_prevue`),
  INDEX `idx_professional` (`professional_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`analysis_id`) REFERENCES `analyses`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`pathologie_id`) REFERENCES `pathologies`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`professional_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: treatment_entries (Entrees de suivi)
-- ============================================
DROP TABLE IF EXISTS `treatment_entries`;
CREATE TABLE `treatment_entries` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `treatment_plan_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `date_entry` DATE NOT NULL,
  `type` ENUM('photo', 'note', 'symptom', 'medication', 'appointment') DEFAULT 'note',
  `image_path` VARCHAR(512) DEFAULT NULL,
  `thumbnail_path` VARCHAR(512) DEFAULT NULL,
  `note` TEXT,
  `symptomes_observes` JSON DEFAULT NULL COMMENT 'Liste des symptomes observes',
  `douleur_niveau` TINYINT UNSIGNED DEFAULT NULL CHECK (`douleur_niveau` >= 0 AND `douleur_niveau` <= 10),
  `amelioration_percue` ENUM('pire', 'stable', 'legere', 'notable', 'guerison') DEFAULT NULL,
  `medicaments_pris` JSON DEFAULT NULL COMMENT 'Medicaments pris ce jour',
  `effets_secondaires` TEXT,
  `humeur` ENUM('tres_mal', 'mal', 'neutre', 'bien', 'tres_bien') DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_uuid` (`uuid`),
  INDEX `idx_treatment` (`treatment_plan_id`),
  INDEX `idx_user` (`user_id`),
  INDEX `idx_date` (`date_entry`),
  INDEX `idx_type` (`type`),
  FOREIGN KEY (`treatment_plan_id`) REFERENCES `treatment_plans`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: professional_notes (Notes professionnelles)
-- ============================================
DROP TABLE IF EXISTS `professional_notes`;
CREATE TABLE `professional_notes` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `professional_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT 'Patient concerne',
  `analysis_id` BIGINT UNSIGNED NULL,
  `treatment_plan_id` BIGINT UNSIGNED NULL,
  `type` ENUM('diagnosis', 'recommendation', 'prescription', 'follow_up', 'general') DEFAULT 'general',
  `titre` VARCHAR(255) DEFAULT NULL,
  `contenu` TEXT NOT NULL,
  `visibilite` ENUM('professional_only', 'shared_with_patient') DEFAULT 'shared_with_patient',
  `importance` ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_uuid` (`uuid`),
  INDEX `idx_professional` (`professional_id`),
  INDEX `idx_user` (`user_id`),
  INDEX `idx_analysis` (`analysis_id`),
  INDEX `idx_treatment` (`treatment_plan_id`),
  FOREIGN KEY (`professional_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`analysis_id`) REFERENCES `analyses`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`treatment_plan_id`) REFERENCES `treatment_plans`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: professional_patient_links (Liaisons pro-patient)
-- ============================================
DROP TABLE IF EXISTS `professional_patient_links`;
CREATE TABLE `professional_patient_links` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `professional_id` BIGINT UNSIGNED NOT NULL,
  `patient_id` BIGINT UNSIGNED NOT NULL,
  `status` ENUM('pending', 'active', 'rejected', 'ended') DEFAULT 'pending',
  `requested_by` ENUM('professional', 'patient') DEFAULT 'professional',
  `permissions` JSON DEFAULT NULL COMMENT 'Permissions specifiques',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `accepted_at` TIMESTAMP NULL,
  `ended_at` TIMESTAMP NULL,
  UNIQUE KEY `unique_link` (`professional_id`, `patient_id`),
  INDEX `idx_professional` (`professional_id`),
  INDEX `idx_patient` (`patient_id`),
  INDEX `idx_status` (`status`),
  FOREIGN KEY (`professional_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`patient_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: conseils (Conseils associes aux analyses)
-- ============================================
DROP TABLE IF EXISTS `conseils`;
CREATE TABLE `conseils` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `analysis_id` BIGINT UNSIGNED NOT NULL,
  `pathologie_id` BIGINT UNSIGNED DEFAULT NULL,
  `type_conseil` ENUM('hygiene', 'traitement', 'prevention', 'consultation', 'urgence', 'general') DEFAULT 'general',
  `titre` VARCHAR(255) DEFAULT NULL,
  `texte_conseil` TEXT NOT NULL,
  `priorite` TINYINT UNSIGNED DEFAULT 1,
  `source` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_analysis` (`analysis_id`),
  INDEX `idx_type` (`type_conseil`),
  FOREIGN KEY (`analysis_id`) REFERENCES `analyses`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`pathologie_id`) REFERENCES `pathologies`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: logs (Journalisation des actions)
-- ============================================
DROP TABLE IF EXISTS `logs`;
CREATE TABLE `logs` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NULL,
  `session_id` BIGINT UNSIGNED NULL,
  `action` VARCHAR(100) NOT NULL,
  `entity_type` VARCHAR(50) DEFAULT NULL,
  `entity_id` BIGINT UNSIGNED DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `meta` JSON DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `user_agent` VARCHAR(512) DEFAULT NULL,
  `severity` ENUM('debug', 'info', 'warning', 'error', 'critical') DEFAULT 'info',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_user` (`user_id`),
  INDEX `idx_action` (`action`),
  INDEX `idx_entity` (`entity_type`, `entity_id`),
  INDEX `idx_severity` (`severity`),
  INDEX `idx_created` (`created_at`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: feedback (Retours utilisateurs)
-- ============================================
DROP TABLE IF EXISTS `feedback`;
CREATE TABLE `feedback` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NULL,
  `analysis_id` BIGINT UNSIGNED NULL,
  `type` ENUM('bug', 'suggestion', 'precision', 'autre') DEFAULT 'autre',
  `rating` TINYINT UNSIGNED DEFAULT NULL CHECK (`rating` >= 1 AND `rating` <= 5),
  `resultat_correct` TINYINT(1) DEFAULT NULL,
  `commentaire` TEXT,
  `diagnostic_reel` VARCHAR(255) DEFAULT NULL,
  `status` ENUM('new', 'reviewed', 'resolved', 'ignored') DEFAULT 'new',
  `admin_notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at` TIMESTAMP NULL,
  INDEX `idx_user` (`user_id`),
  INDEX `idx_analysis` (`analysis_id`),
  INDEX `idx_status` (`status`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`analysis_id`) REFERENCES `analyses`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: notifications (Notifications utilisateurs)
-- ============================================
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `type` ENUM('info', 'warning', 'success', 'analysis_complete', 'reminder', 'system', 'treatment_reminder', 'professional_note') DEFAULT 'info',
  `titre` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `link` VARCHAR(512) DEFAULT NULL,
  `read_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_user` (`user_id`),
  INDEX `idx_read` (`read_at`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: statistiques_globales (Cache stats)
-- ============================================
DROP TABLE IF EXISTS `statistiques_globales`;
CREATE TABLE `statistiques_globales` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `date` DATE NOT NULL UNIQUE,
  `total_analyses` INT UNSIGNED DEFAULT 0,
  `total_users` INT UNSIGNED DEFAULT 0,
  `analyses_sain` INT UNSIGNED DEFAULT 0,
  `analyses_bas` INT UNSIGNED DEFAULT 0,
  `analyses_modere` INT UNSIGNED DEFAULT 0,
  `analyses_eleve` INT UNSIGNED DEFAULT 0,
  `analyses_critique` INT UNSIGNED DEFAULT 0,
  `pathologie_plus_frequente` VARCHAR(255) DEFAULT NULL,
  `temps_traitement_moyen_ms` INT UNSIGNED DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Donnees initiales: Pathologies
-- ============================================
INSERT INTO `pathologies` (`code`, `nom`, `nom_scientifique`, `description`, `symptomes`, `causes`, `niveau_gravite`, `contagieux`) VALUES
('ONYCHO', 'Onychomycose', 'Tinea unguium', 
 'Infection fongique de l''ongle causee par des dermatophytes, levures ou moisissures.',
 'Epaississement de l''ongle, decoloration jaune-brun, fragilite, decollement, odeur desagreable',
 'Champignons (dermatophytes principalement), humidite, traumatisme, diabete, immunodepression',
 'modere', 1),

('PSORIASIS', 'Psoriasis ungueal', 'Psoriasis unguium',
 'Manifestation du psoriasis au niveau des ongles, frequente chez les patients atteints de psoriasis cutane.',
 'Ponctuations (pitting), taches saumon, onycholyse, hyperkeratose, lignes de Beau',
 'Maladie auto-immune, facteurs genetiques, stress, traumatismes',
 'modere', 0),

('MELANONYCHIE', 'Melanonychie', 'Melanonychia striata',
 'Pigmentation brune ou noire de l''ongle sous forme de bandes longitudinales.',
 'Bandes pigmentees longitudinales, coloration brune a noire',
 'Activation melanocytaire, traumatisme, medicaments, melanome (rare)',
 'eleve', 0),

('ONYCHOLYSE', 'Onycholyse', 'Onycholysis',
 'Decollement de l''ongle de son lit ungueal, debutant generalement par le bord libre.',
 'Decollement de l''ongle, zone blanchatre ou jaunatre sous l''ongle',
 'Traumatisme, infection fongique, psoriasis, produits chimiques, medicaments',
 'faible', 0),

('PARONYCHI', 'Paronychie', 'Paronychia',
 'Infection du repli cutane autour de l''ongle (perionyxis).',
 'Rougeur, gonflement, douleur autour de l''ongle, pus possible',
 'Bacteries (staphylocoque), candida, traumatisme, manucure agressive',
 'modere', 0),

('LICHEN', 'Lichen plan ungueal', 'Lichen planus unguium',
 'Atteinte des ongles par le lichen plan, maladie inflammatoire.',
 'Striations longitudinales, amincissement, pterygion dorsal, destruction de l''ongle',
 'Maladie auto-immune, reaction inflammatoire',
 'modere', 0),

('HEMATOME', 'Hematome sous-ungueal', 'Subungual hematoma',
 'Accumulation de sang sous l''ongle suite a un traumatisme.',
 'Coloration rouge-violet puis noire, douleur pulsatile',
 'Traumatisme direct (ecrasement, choc)',
 'faible', 0),

('SAIN', 'Ongle sain', NULL,
 'Ongle normal sans pathologie detectee.',
 'Ongle rose, lisse, brillant, sans deformation ni decoloration',
 NULL,
 'faible', 0);

-- ============================================
-- Donnees initiales: Admin par defaut
-- ============================================
INSERT INTO `users` (`nom`, `prenom`, `email`, `password_hash`, `role`, `status`, `email_verified`, `consent_data`) VALUES
('Admin', 'System', 'admin@unguealhealth.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'active', 1, 1);
-- Password: password

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- Vue: Statistiques utilisateur
-- ============================================
CREATE OR REPLACE VIEW `v_user_stats` AS
SELECT 
  u.id AS user_id,
  u.nom,
  u.email,
  u.role,
  COUNT(DISTINCT a.id) AS total_analyses,
  SUM(CASE WHEN a.niveau_risque = 'sain' THEN 1 ELSE 0 END) AS analyses_sain,
  SUM(CASE WHEN a.niveau_risque = 'eleve' OR a.niveau_risque = 'critique' THEN 1 ELSE 0 END) AS analyses_risque,
  COUNT(DISTINCT tp.id) AS total_treatments,
  MAX(a.date_analyse) AS derniere_analyse
FROM users u
LEFT JOIN analyses a ON u.id = a.user_id
LEFT JOIN treatment_plans tp ON u.id = tp.user_id
GROUP BY u.id, u.nom, u.email, u.role;

-- ============================================
-- Vue: Suivi traitement actif
-- ============================================
CREATE OR REPLACE VIEW `v_active_treatments` AS
SELECT 
  tp.id,
  tp.uuid,
  tp.user_id,
  tp.titre,
  tp.pathologie_id,
  p.nom AS pathologie_nom,
  tp.date_debut,
  tp.date_fin_prevue,
  tp.status,
  tp.frequence_suivi,
  COUNT(te.id) AS total_entries,
  MAX(te.date_entry) AS derniere_entree,
  DATEDIFF(CURDATE(), MAX(te.date_entry)) AS jours_depuis_derniere_entree
FROM treatment_plans tp
LEFT JOIN pathologies p ON tp.pathologie_id = p.id
LEFT JOIN treatment_entries te ON tp.id = te.treatment_plan_id
WHERE tp.status = 'active'
GROUP BY tp.id, tp.uuid, tp.user_id, tp.titre, tp.pathologie_id, p.nom, tp.date_debut, tp.date_fin_prevue, tp.status, tp.frequence_suivi;

-- ============================================
-- Fin du script
-- ============================================

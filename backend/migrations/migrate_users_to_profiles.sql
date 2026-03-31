-- Migration: move profile-related columns from users to dedicated profile tables
-- Run once against your database. Review before executing.

START TRANSACTION;

-- Ensure target tables exist (no-op if already present)
CREATE TABLE IF NOT EXISTS patient_profiles (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL UNIQUE,
  date_naissance DATE DEFAULT NULL,
  sexe ENUM('homme','femme','autre') DEFAULT NULL,
  groupe_sanguin VARCHAR(10) DEFAULT NULL,
  allergies TEXT DEFAULT NULL,
  antecedents_medicaux TEXT DEFAULT NULL,
  traitement_en_cours TEXT DEFAULT NULL,
  contact_urgence VARCHAR(255) DEFAULT NULL,
  telephone VARCHAR(20) DEFAULT NULL,
  adresse VARCHAR(512) DEFAULT NULL,
  ville VARCHAR(255) DEFAULT NULL,
  pays VARCHAR(255) DEFAULT NULL,
  photo_profil VARCHAR(512) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS professional_profiles (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL UNIQUE,
  specialite VARCHAR(255) DEFAULT NULL,
  sous_specialite VARCHAR(255) DEFAULT NULL,
  matricule_professionnel VARCHAR(255) DEFAULT NULL,
  numero_ordre VARCHAR(100) DEFAULT NULL,
  etablissement VARCHAR(255) DEFAULT NULL,
  experience TEXT DEFAULT NULL,
  biographie TEXT DEFAULT NULL,
  telephone_professionnel VARCHAR(20) DEFAULT NULL,
  adresse_professionnelle VARCHAR(512) DEFAULT NULL,
  ville VARCHAR(255) DEFAULT NULL,
  pays VARCHAR(255) DEFAULT NULL,
  photo_profil VARCHAR(512) DEFAULT NULL,
  statut_validation ENUM('pending','approved','rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert patient profiles for users with patient-like data (skip if profile exists)
INSERT INTO patient_profiles (user_id, date_naissance, sexe, groupe_sanguin, allergies, antecedents_medicaux, traitement_en_cours, contact_urgence, telephone, adresse, ville, pays, photo_profil, created_at, updated_at)
SELECT u.id, u.date_naissance, u.sexe, u.groupe_sanguin, u.allergies, u.antecedents, u.traitement_en_cours, u.contact_urgence, u.telephone_urgence, u.adresse, u.ville, u.pays, u.avatar_url, NOW(), NOW()
FROM users u
WHERE (
  u.date_naissance IS NOT NULL OR u.groupe_sanguin IS NOT NULL OR u.allergies IS NOT NULL OR u.antecedents IS NOT NULL OR u.traitement_en_cours IS NOT NULL OR u.contact_urgence IS NOT NULL OR u.telephone_urgence IS NOT NULL OR u.adresse IS NOT NULL OR u.ville IS NOT NULL OR u.pays IS NOT NULL
) AND NOT EXISTS (SELECT 1 FROM patient_profiles p WHERE p.user_id = u.id);

-- Insert professional profiles for users with professional role or professional-like columns (skip if exists)
INSERT INTO professional_profiles (user_id, specialite, sous_specialite, matricule_professionnel, numero_ordre, etablissement, experience, biographie, telephone_professionnel, adresse_professionnelle, ville, pays, photo_profil, statut_validation, created_at, updated_at)
SELECT u.id, u.specialite, u.sous_specialite, u.matricule, u.numero_ordre, u.etablissement, CAST(u.annees_experience AS CHAR), NULL, u.telephone, u.adresse, u.ville, u.pays, u.avatar_url, CASE WHEN u.status IN ('approved','active') THEN 'approved' ELSE 'pending' END, NOW(), NOW()
FROM users u
WHERE (u.role IN ('professional','student') OR u.specialite IS NOT NULL OR u.numero_ordre IS NOT NULL OR u.etablissement IS NOT NULL OR u.matricule IS NOT NULL OR u.annees_experience IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM professional_profiles pp WHERE pp.user_id = u.id);

COMMIT;

-- Note: This migration only copies data. After verifying correctness, you may choose to drop migrated columns from `users`.
-- Backup your database before running this script.

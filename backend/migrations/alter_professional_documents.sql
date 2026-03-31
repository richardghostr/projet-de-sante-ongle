-- Migration: add fields for professional document validation
-- Adds: type_document, statut_validation, commentaire_admin, date_validation

ALTER TABLE `professional_documents`
  ADD COLUMN `type_document` VARCHAR(100) DEFAULT NULL AFTER `filename`,
  ADD COLUMN `statut_validation` ENUM('pending','approved','rejected') DEFAULT 'pending' AFTER `type`,
  ADD COLUMN `commentaire_admin` TEXT DEFAULT NULL AFTER `statut_validation`,
  ADD COLUMN `date_validation` TIMESTAMP NULL DEFAULT NULL AFTER `updated_at`;

-- Backfill: set statut_validation from verified if present
UPDATE `professional_documents` SET `statut_validation` = CASE WHEN `verified` = 1 THEN 'approved' ELSE 'pending' END WHERE `statut_validation` IS NULL OR `statut_validation` = '';

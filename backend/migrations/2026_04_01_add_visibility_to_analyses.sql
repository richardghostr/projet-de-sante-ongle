-- Migration: add visibility_status to analyses
-- Date: 2026-04-01

SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE `analyses`
  ADD COLUMN `visibility_status` TINYINT(1) NOT NULL DEFAULT 0 AFTER `heatmap_path`;

CREATE INDEX `idx_visibility` ON `analyses` (`visibility_status`);

SET FOREIGN_KEY_CHECKS = 1;

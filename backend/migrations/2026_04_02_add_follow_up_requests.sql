-- Migration: add follow_up_requests table
DROP TABLE IF EXISTS `follow_up_requests`;
CREATE TABLE `follow_up_requests` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `patient_id` BIGINT UNSIGNED NOT NULL,
  `professional_id` BIGINT UNSIGNED NOT NULL,
  `analysis_id` BIGINT UNSIGNED NULL,
  `message` TEXT DEFAULT NULL,
  `status` ENUM('pending','accepted','rejected') DEFAULT 'pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_patient` (`patient_id`),
  INDEX `idx_professional` (`professional_id`),
  INDEX `idx_status` (`status`),
  FOREIGN KEY (`patient_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`professional_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`analysis_id`) REFERENCES `analyses`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

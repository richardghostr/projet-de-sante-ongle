-- Minimal schema for UNGUEALHEALTH (MySQL)

CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `nom` VARCHAR(150) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('user','student','admin') DEFAULT 'user',
  `consent_data` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `analyses` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NULL,
  `image_path` VARCHAR(512) NOT NULL,
  `thumbnail_path` VARCHAR(512),
  `result_json` JSON,
  `score_confiance` FLOAT,
  `niveau_risque` ENUM('bas','modere','eleve') DEFAULT 'bas',
  `model_version` VARCHAR(64),
  `date_analyse` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_user_date` (`user_id`, `date_analyse`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `conseils` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `analysis_id` BIGINT UNSIGNED NOT NULL,
  `texte_conseil` TEXT NOT NULL,
  FOREIGN KEY (`analysis_id`) REFERENCES `analyses`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `logs` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NULL,
  `action` VARCHAR(255) NOT NULL,
  `meta` JSON NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (`user_id`)
) ENGINE=InnoDB;

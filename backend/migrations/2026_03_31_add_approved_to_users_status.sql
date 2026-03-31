-- Migration: add 'approved' to users.status enum
-- Run this once against the unguealhealth database (backup first)

SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS;
SET FOREIGN_KEY_CHECKS=0;

ALTER TABLE `users`
  MODIFY `status` ENUM(
    'active', 'inactive', 'suspended', 'deleted', 'pending', 'approved', 'pending_verification'
  ) NULL DEFAULT 'active';

SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;

-- End migration

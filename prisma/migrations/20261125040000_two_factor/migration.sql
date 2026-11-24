-- AlterTable
ALTER TABLE `User` ADD COLUMN `twoFactorSecret` VARCHAR(255) NULL,
    ADD COLUMN `twoFactorEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `twoFactorRecoveryHash` VARCHAR(255) NULL;

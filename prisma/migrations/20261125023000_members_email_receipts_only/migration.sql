/*
  Warnings:

  - You are about to drop the column `customerPhone` on the `sale` table. All the data in the column will be lost.
  - Kanal WhatsApp/BOTH dinormalisasi menjadi EMAIL sebelum enum dipangkas.

*/
-- AlterTable
ALTER TABLE `sale` DROP COLUMN `customerPhone`,
    ADD COLUMN `customerId` INTEGER NULL;

-- Kanal struk sekarang email saja; data lama tetap bisa dibaca.
UPDATE `sale` SET `receiptChannel` = 'EMAIL' WHERE `receiptChannel` IN ('WHATSAPP', 'BOTH');
ALTER TABLE `sale` MODIFY `receiptChannel` ENUM('NONE', 'EMAIL') NOT NULL DEFAULT 'NONE';

-- CreateTable
CREATE TABLE `Customer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tenantId` INTEGER NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `email` VARCHAR(120) NOT NULL,
    `note` VARCHAR(200) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Customer_tenantId_name_idx`(`tenantId`, `name`),
    UNIQUE INDEX `Customer_tenantId_email_key`(`tenantId`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Sale_tenantId_customerId_idx` ON `Sale`(`tenantId`, `customerId`);

-- AddForeignKey
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

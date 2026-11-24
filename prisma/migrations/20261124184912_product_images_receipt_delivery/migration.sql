-- AlterTable
ALTER TABLE `product` ADD COLUMN `imageData` MEDIUMTEXT NULL;

-- AlterTable
ALTER TABLE `sale` ADD COLUMN `customerEmail` VARCHAR(120) NULL,
    ADD COLUMN `customerName` VARCHAR(120) NULL,
    ADD COLUMN `customerPhone` VARCHAR(32) NULL,
    ADD COLUMN `receiptChannel` ENUM('NONE', 'WHATSAPP', 'EMAIL', 'BOTH') NOT NULL DEFAULT 'NONE',
    ADD COLUMN `receiptError` VARCHAR(300) NULL,
    ADD COLUMN `receiptSent` BOOLEAN NOT NULL DEFAULT false;

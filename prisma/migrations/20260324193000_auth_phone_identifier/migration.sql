-- AlterTable
ALTER TABLE `User`
    MODIFY `email` VARCHAR(191) NULL,
    ADD COLUMN `phoneNumber` VARCHAR(191) NULL AFTER `email`;

-- CreateIndex
CREATE UNIQUE INDEX `User_phoneNumber_key` ON `User`(`phoneNumber`);

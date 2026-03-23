-- AlterTable
ALTER TABLE `League`
    ADD COLUMN `provider` VARCHAR(191) NULL,
    ADD COLUMN `externalRef` VARCHAR(191) NULL,
    ADD COLUMN `logoUrl` VARCHAR(191) NULL,
    ADD COLUMN `metadata` JSON NULL,
    ADD UNIQUE INDEX `League_externalRef_key`(`externalRef`);

-- AlterTable
ALTER TABLE `Season`
    ADD COLUMN `provider` VARCHAR(191) NULL,
    ADD COLUMN `externalRef` VARCHAR(191) NULL,
    ADD COLUMN `metadata` JSON NULL,
    ADD UNIQUE INDEX `Season_externalRef_key`(`externalRef`);

-- AlterTable
ALTER TABLE `Team`
    ADD COLUMN `provider` VARCHAR(191) NULL,
    ADD COLUMN `externalRef` VARCHAR(191) NULL,
    ADD COLUMN `logoUrl` VARCHAR(191) NULL,
    ADD COLUMN `metadata` JSON NULL,
    ADD UNIQUE INDEX `Team_externalRef_key`(`externalRef`);

-- AlterTable
ALTER TABLE `Fixture`
    ADD COLUMN `provider` VARCHAR(191) NULL,
    ADD COLUMN `round` VARCHAR(191) NULL,
    ADD COLUMN `stateReason` VARCHAR(191) NULL,
    ADD COLUMN `lastSyncedAt` DATETIME(3) NULL,
    ADD COLUMN `metadata` JSON NULL;

-- AlterTable
ALTER TABLE `OddsMarket`
    ADD COLUMN `provider` VARCHAR(191) NULL,
    ADD COLUMN `externalRef` VARCHAR(191) NULL,
    ADD COLUMN `metadata` JSON NULL,
    ADD UNIQUE INDEX `OddsMarket_externalRef_key`(`externalRef`);

-- AlterTable
ALTER TABLE `OddsSelection`
    ADD COLUMN `externalRef` VARCHAR(191) NULL,
    ADD COLUMN `metadata` JSON NULL,
    ADD UNIQUE INDEX `OddsSelection_externalRef_key`(`externalRef`);

-- AlterTable
ALTER TABLE `SyncJob`
    ADD COLUMN `provider` VARCHAR(191) NOT NULL DEFAULT 'SPORTSMONKS',
    ADD COLUMN `bucket` VARCHAR(191) NOT NULL DEFAULT 'manual',
    ADD COLUMN `recordsProcessed` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `resultSummary` JSON NULL,
    ADD INDEX `SyncJob_provider_bucket_createdAt_idx`(`provider`, `bucket`, `createdAt`);

-- AlterTable
ALTER TABLE `SyncCheckpoint`
    DROP INDEX `SyncCheckpoint_syncJobId_cursor_key`,
    MODIFY `syncJobId` VARCHAR(191) NULL,
    MODIFY `cursor` VARCHAR(191) NULL,
    ADD COLUMN `provider` VARCHAR(191) NOT NULL DEFAULT 'SPORTSMONKS',
    ADD COLUMN `key` VARCHAR(191) NOT NULL,
    ADD COLUMN `errorMessage` TEXT NULL,
    ADD COLUMN `lastSuccessAt` DATETIME(3) NULL,
    ADD COLUMN `lastFailureAt` DATETIME(3) NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD UNIQUE INDEX `SyncCheckpoint_provider_key_key`(`provider`, `key`),
    ADD INDEX `SyncCheckpoint_provider_updatedAt_idx`(`provider`, `updatedAt`);

-- RedefineForeignKey
ALTER TABLE `SyncCheckpoint` DROP FOREIGN KEY `SyncCheckpoint_syncJobId_fkey`;
ALTER TABLE `SyncCheckpoint` ADD CONSTRAINT `SyncCheckpoint_syncJobId_fkey`
    FOREIGN KEY (`syncJobId`) REFERENCES `SyncJob`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

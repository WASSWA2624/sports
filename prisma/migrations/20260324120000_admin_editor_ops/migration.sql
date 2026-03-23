-- AlterTable
ALTER TABLE `AuditLog`
    ADD COLUMN `requestId` VARCHAR(191) NULL,
    ADD COLUMN `actorRoles` JSON NULL,
    ADD COLUMN `ipAddress` VARCHAR(191) NULL,
    ADD COLUMN `userAgent` VARCHAR(191) NULL,
    ADD COLUMN `previousHash` VARCHAR(191) NULL,
    ADD COLUMN `eventHash` VARCHAR(191) NULL,
    ADD UNIQUE INDEX `AuditLog_eventHash_key`(`eventHash`),
    ADD INDEX `AuditLog_action_createdAt_idx`(`action`, `createdAt`);

-- CreateTable
CREATE TABLE `ShellModule` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `isEnabled` BOOLEAN NOT NULL DEFAULT true,
    `emergencyDisabled` BOOLEAN NOT NULL DEFAULT false,
    `emergencyReason` TEXT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ShellModule_key_key`(`key`),
    INDEX `ShellModule_location_isEnabled_idx`(`location`, `isEnabled`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdSlot` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `placement` VARCHAR(191) NOT NULL,
    `size` VARCHAR(191) NULL,
    `copy` TEXT NULL,
    `ctaLabel` VARCHAR(191) NULL,
    `ctaUrl` VARCHAR(191) NULL,
    `isEnabled` BOOLEAN NOT NULL DEFAULT true,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AdSlot_key_key`(`key`),
    INDEX `AdSlot_placement_isEnabled_idx`(`placement`, `isEnabled`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ConsentText` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `locale` VARCHAR(191) NOT NULL DEFAULT 'en',
    `title` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ConsentText_key_locale_key`(`key`, `locale`),
    INDEX `ConsentText_locale_isActive_idx`(`locale`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RouteErrorEvent` (
    `id` VARCHAR(191) NOT NULL,
    `route` VARCHAR(191) NOT NULL,
    `boundary` VARCHAR(191) NOT NULL,
    `digest` VARCHAR(191) NULL,
    `message` TEXT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RouteErrorEvent_route_createdAt_idx`(`route`, `createdAt`),
    INDEX `RouteErrorEvent_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OpsIssue` (
    `id` VARCHAR(191) NOT NULL,
    `issueType` ENUM('DATA_DISPUTE', 'WRONG_SCORE', 'BROKEN_ARTICLE_CONTENT') NOT NULL,
    `status` ENUM('OPEN', 'INVESTIGATING', 'RESOLVED', 'DISMISSED') NOT NULL DEFAULT 'OPEN',
    `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `entityType` VARCHAR(191) NULL,
    `entityId` VARCHAR(191) NULL,
    `fixtureId` VARCHAR(191) NULL,
    `articleId` VARCHAR(191) NULL,
    `reporterUserId` VARCHAR(191) NULL,
    `assigneeUserId` VARCHAR(191) NULL,
    `resolutionSummary` TEXT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `resolvedAt` DATETIME(3) NULL,

    INDEX `OpsIssue_status_priority_createdAt_idx`(`status`, `priority`, `createdAt`),
    INDEX `OpsIssue_entityType_entityId_idx`(`entityType`, `entityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `OpsIssue` ADD CONSTRAINT `OpsIssue_fixtureId_fkey`
    FOREIGN KEY (`fixtureId`) REFERENCES `Fixture`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OpsIssue` ADD CONSTRAINT `OpsIssue_articleId_fkey`
    FOREIGN KEY (`articleId`) REFERENCES `NewsArticle`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OpsIssue` ADD CONSTRAINT `OpsIssue_reporterUserId_fkey`
    FOREIGN KEY (`reporterUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OpsIssue` ADD CONSTRAINT `OpsIssue_assigneeUserId_fkey`
    FOREIGN KEY (`assigneeUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

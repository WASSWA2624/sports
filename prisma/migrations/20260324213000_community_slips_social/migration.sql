-- CreateTable
CREATE TABLE `CommunitySlip` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `summary` TEXT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'SETTLED', 'VOID') NOT NULL DEFAULT 'DRAFT',
    `visibility` ENUM('PRIVATE', 'PUBLIC') NOT NULL DEFAULT 'PRIVATE',
    `stakeAmount` DECIMAL(12, 2) NULL,
    `totalOdds` DECIMAL(12, 4) NULL,
    `expectedPayout` DECIMAL(12, 2) NULL,
    `selectionCount` INTEGER NOT NULL DEFAULT 0,
    `likeCount` INTEGER NOT NULL DEFAULT 0,
    `publishedAt` DATETIME(3) NULL,
    `settledAt` DATETIME(3) NULL,
    `outcomeStatus` ENUM('OPEN', 'WON', 'LOST', 'VOID') NOT NULL DEFAULT 'OPEN',
    `outcomeSummary` VARCHAR(191) NULL,
    `isFeatured` BOOLEAN NOT NULL DEFAULT false,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CommunitySlip_userId_status_updatedAt_idx`(`userId`, `status`, `updatedAt`),
    INDEX `CommunitySlip_status_visibility_publishedAt_idx`(`status`, `visibility`, `publishedAt`),
    INDEX `CommunitySlip_isFeatured_publishedAt_idx`(`isFeatured`, `publishedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommunitySlipSelection` (
    `id` VARCHAR(191) NOT NULL,
    `communitySlipId` VARCHAR(191) NOT NULL,
    `fixtureId` VARCHAR(191) NOT NULL,
    `oddsSelectionId` VARCHAR(191) NOT NULL,
    `oddsMarketId` VARCHAR(191) NULL,
    `marketType` VARCHAR(191) NULL,
    `selectionLabel` VARCHAR(191) NOT NULL,
    `line` DECIMAL(10, 2) NULL,
    `priceDecimal` DECIMAL(10, 4) NOT NULL,
    `bookmaker` VARCHAR(191) NULL,
    `fixtureLabel` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CommunitySlipSelection_communitySlipId_oddsSelectionId_key`(`communitySlipId`, `oddsSelectionId`),
    INDEX `CommunitySlipSelection_communitySlipId_sortOrder_idx`(`communitySlipId`, `sortOrder`),
    INDEX `CommunitySlipSelection_fixtureId_createdAt_idx`(`fixtureId`, `createdAt`),
    INDEX `CommunitySlipSelection_oddsSelectionId_idx`(`oddsSelectionId`),
    INDEX `CommunitySlipSelection_oddsMarketId_idx`(`oddsMarketId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommunitySlipLike` (
    `communitySlipId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CommunitySlipLike_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`communitySlipId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CommunitySlip` ADD CONSTRAINT `CommunitySlip_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunitySlipSelection` ADD CONSTRAINT `CommunitySlipSelection_communitySlipId_fkey` FOREIGN KEY (`communitySlipId`) REFERENCES `CommunitySlip`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunitySlipSelection` ADD CONSTRAINT `CommunitySlipSelection_fixtureId_fkey` FOREIGN KEY (`fixtureId`) REFERENCES `Fixture`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunitySlipSelection` ADD CONSTRAINT `CommunitySlipSelection_oddsSelectionId_fkey` FOREIGN KEY (`oddsSelectionId`) REFERENCES `OddsSelection`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunitySlipSelection` ADD CONSTRAINT `CommunitySlipSelection_oddsMarketId_fkey` FOREIGN KEY (`oddsMarketId`) REFERENCES `OddsMarket`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunitySlipLike` ADD CONSTRAINT `CommunitySlipLike_communitySlipId_fkey` FOREIGN KEY (`communitySlipId`) REFERENCES `CommunitySlip`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunitySlipLike` ADD CONSTRAINT `CommunitySlipLike_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE `Standing` DROP FOREIGN KEY `Standing_seasonId_fkey`;

-- DropIndex
DROP INDEX `Standing_seasonId_teamId_key` ON `Standing`;

-- DropIndex
DROP INDEX `ArticleEntityLink_entityType_entityId_idx` ON `ArticleEntityLink`;

-- AlterTable
ALTER TABLE `SourceProvider` ADD COLUMN `fallbackProviderId` VARCHAR(191) NULL,
    ADD COLUMN `family` VARCHAR(191) NULL,
    ADD COLUMN `namespace` VARCHAR(191) NULL,
    ADD COLUMN `priority` INTEGER NOT NULL DEFAULT 100,
    ADD COLUMN `role` VARCHAR(191) NULL,
    ADD COLUMN `tier` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Fixture` ADD COLUMN `roundId` VARCHAR(191) NULL,
    ADD COLUMN `stageId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Standing` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `groupName` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `metadata` JSON NULL,
    ADD COLUMN `roundId` VARCHAR(191) NULL,
    ADD COLUMN `scope` VARCHAR(191) NOT NULL DEFAULT 'OVERALL',
    ADD COLUMN `stageId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `OddsMarket` ADD COLUMN `bookmakerId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `ResultSnapshot` ADD COLUMN `awayPenaltyScore` INTEGER NULL,
    ADD COLUMN `homePenaltyScore` INTEGER NULL,
    ADD COLUMN `phase` VARCHAR(191) NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NULL,
    ADD COLUMN `winnerSide` ENUM('HOME', 'AWAY', 'NEUTRAL') NULL;

-- UpdateData
UPDATE `ResultSnapshot`
SET `updatedAt` = COALESCE(`capturedAt`, CURRENT_TIMESTAMP(3))
WHERE `updatedAt` IS NULL;

-- AlterTable
ALTER TABLE `ResultSnapshot`
    MODIFY `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `Incident` ADD COLUMN `incidentKey` VARCHAR(191) NULL,
    ADD COLUMN `secondaryLabel` VARCHAR(191) NULL,
    ADD COLUMN `secondaryPlayerId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Lineup` ADD COLUMN `externalRef` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Statistic` ADD COLUMN `metricKey` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `BroadcastChannel` ADD COLUMN `externalRef` VARCHAR(191) NULL,
    ADD COLUMN `sourceCode` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `ArticleEntityLink` ADD COLUMN `publishedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `SyncJob` ADD COLUMN `sourceProviderId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `SyncCheckpoint` ADD COLUMN `sourceProviderId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `ProviderEntityRef` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `externalRef` VARCHAR(191) NOT NULL,
    `sourceCode` VARCHAR(191) NULL,
    `sourceName` VARCHAR(191) NULL,
    `feedFamily` VARCHAR(191) NULL,
    `role` VARCHAR(191) NULL,
    `tier` VARCHAR(191) NULL,
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ProviderEntityRef_entityType_entityId_isPrimary_idx`(`entityType`, `entityId`, `isPrimary`),
    INDEX `ProviderEntityRef_providerId_entityType_entityId_idx`(`providerId`, `entityType`, `entityId`),
    INDEX `ProviderEntityRef_providerId_sourceCode_idx`(`providerId`, `sourceCode`),
    UNIQUE INDEX `ProviderEntityRef_providerId_entityType_externalRef_key`(`providerId`, `entityType`, `externalRef`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Stage` (
    `id` VARCHAR(191) NOT NULL,
    `competitionId` VARCHAR(191) NOT NULL,
    `seasonId` VARCHAR(191) NULL,
    `parentStageId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NULL,
    `externalRef` VARCHAR(191) NULL,
    `stageType` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Stage_externalRef_key`(`externalRef`),
    INDEX `Stage_competitionId_seasonId_sortOrder_idx`(`competitionId`, `seasonId`, `sortOrder`),
    UNIQUE INDEX `Stage_competitionId_seasonId_slug_key`(`competitionId`, `seasonId`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Round` (
    `id` VARCHAR(191) NOT NULL,
    `competitionId` VARCHAR(191) NOT NULL,
    `seasonId` VARCHAR(191) NULL,
    `stageId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NULL,
    `externalRef` VARCHAR(191) NULL,
    `roundType` VARCHAR(191) NULL,
    `sequence` INTEGER NULL,
    `startsAt` DATETIME(3) NULL,
    `endsAt` DATETIME(3) NULL,
    `isCurrent` BOOLEAN NOT NULL DEFAULT false,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Round_externalRef_key`(`externalRef`),
    INDEX `Round_stageId_sequence_idx`(`stageId`, `sequence`),
    INDEX `Round_competitionId_seasonId_sequence_idx`(`competitionId`, `seasonId`, `sequence`),
    UNIQUE INDEX `Round_competitionId_seasonId_slug_key`(`competitionId`, `seasonId`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Bookmaker` (
    `id` VARCHAR(191) NOT NULL,
    `sourceProviderId` VARCHAR(191) NULL,
    `code` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `shortName` VARCHAR(191) NULL,
    `websiteUrl` VARCHAR(191) NULL,
    `logoUrl` VARCHAR(191) NULL,
    `affiliateBaseUrl` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Bookmaker_code_key`(`code`),
    UNIQUE INDEX `Bookmaker_slug_key`(`slug`),
    INDEX `Bookmaker_isActive_name_idx`(`isActive`, `name`),
    INDEX `Bookmaker_sourceProviderId_code_idx`(`sourceProviderId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AffiliateLink` (
    `id` VARCHAR(191) NOT NULL,
    `bookmakerId` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NULL,
    `territory` VARCHAR(191) NULL,
    `locale` VARCHAR(191) NULL,
    `surface` VARCHAR(191) NULL,
    `linkType` VARCHAR(191) NULL,
    `destinationUrl` VARCHAR(191) NOT NULL,
    `trackingTemplate` TEXT NULL,
    `fallbackUrl` VARCHAR(191) NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `priority` INTEGER NOT NULL DEFAULT 100,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AffiliateLink_key_key`(`key`),
    INDEX `AffiliateLink_bookmakerId_territory_isActive_priority_idx`(`bookmakerId`, `territory`, `isActive`, `priority`),
    INDEX `AffiliateLink_surface_territory_isActive_idx`(`surface`, `territory`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClickEvent` (
    `id` VARCHAR(191) NOT NULL,
    `affiliateLinkId` VARCHAR(191) NULL,
    `bookmakerId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `fixtureId` VARCHAR(191) NULL,
    `competitionId` VARCHAR(191) NULL,
    `geo` VARCHAR(191) NULL,
    `locale` VARCHAR(191) NULL,
    `surface` VARCHAR(191) NOT NULL,
    `slotKey` VARCHAR(191) NULL,
    `targetEntityType` VARCHAR(191) NULL,
    `targetEntityId` VARCHAR(191) NULL,
    `sessionId` VARCHAR(191) NULL,
    `requestId` VARCHAR(191) NULL,
    `referrerUrl` VARCHAR(191) NULL,
    `targetUrl` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ClickEvent_bookmakerId_geo_surface_createdAt_idx`(`bookmakerId`, `geo`, `surface`, `createdAt`),
    INDEX `ClickEvent_affiliateLinkId_createdAt_idx`(`affiliateLinkId`, `createdAt`),
    INDEX `ClickEvent_competitionId_createdAt_idx`(`competitionId`, `createdAt`),
    INDEX `ClickEvent_fixtureId_createdAt_idx`(`fixtureId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ConversionEvent` (
    `id` VARCHAR(191) NOT NULL,
    `affiliateLinkId` VARCHAR(191) NULL,
    `bookmakerId` VARCHAR(191) NULL,
    `clickEventId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `fixtureId` VARCHAR(191) NULL,
    `competitionId` VARCHAR(191) NULL,
    `geo` VARCHAR(191) NULL,
    `locale` VARCHAR(191) NULL,
    `surface` VARCHAR(191) NOT NULL,
    `targetEntityType` VARCHAR(191) NULL,
    `targetEntityId` VARCHAR(191) NULL,
    `externalRef` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'SETTLED') NOT NULL DEFAULT 'PENDING',
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `amount` DECIMAL(12, 2) NULL,
    `revenue` DECIMAL(12, 2) NULL,
    `convertedAt` DATETIME(3) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ConversionEvent_externalRef_key`(`externalRef`),
    INDEX `ConversionEvent_bookmakerId_geo_surface_createdAt_idx`(`bookmakerId`, `geo`, `surface`, `createdAt`),
    INDEX `ConversionEvent_affiliateLinkId_createdAt_idx`(`affiliateLinkId`, `createdAt`),
    INDEX `ConversionEvent_status_convertedAt_idx`(`status`, `convertedAt`),
    INDEX `ConversionEvent_competitionId_createdAt_idx`(`competitionId`, `createdAt`),
    INDEX `ConversionEvent_fixtureId_createdAt_idx`(`fixtureId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FunnelEntry` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `channel` VARCHAR(191) NOT NULL,
    `surface` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `ctaLabel` VARCHAR(191) NOT NULL,
    `ctaUrl` VARCHAR(191) NOT NULL,
    `territory` VARCHAR(191) NULL,
    `enabledGeos` JSON NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `priority` INTEGER NOT NULL DEFAULT 100,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `FunnelEntry_key_key`(`key`),
    INDEX `FunnelEntry_surface_isActive_priority_idx`(`surface`, `isActive`, `priority`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PredictionRecommendation` (
    `id` VARCHAR(191) NOT NULL,
    `sourceProviderId` VARCHAR(191) NULL,
    `fixtureId` VARCHAR(191) NULL,
    `competitionId` VARCHAR(191) NULL,
    `teamId` VARCHAR(191) NULL,
    `bookmakerId` VARCHAR(191) NULL,
    `key` VARCHAR(191) NOT NULL,
    `recommendationType` VARCHAR(191) NOT NULL DEFAULT 'PICK',
    `title` VARCHAR(191) NOT NULL,
    `summary` TEXT NULL,
    `marketType` VARCHAR(191) NULL,
    `selectionLabel` VARCHAR(191) NULL,
    `line` DECIMAL(10, 2) NULL,
    `priceDecimal` DECIMAL(10, 4) NULL,
    `confidence` INTEGER NULL,
    `edgeScore` DECIMAL(6, 2) NULL,
    `isPublished` BOOLEAN NOT NULL DEFAULT false,
    `publishedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PredictionRecommendation_key_key`(`key`),
    INDEX `PredictionRecommendation_fixtureId_isPublished_publishedAt_idx`(`fixtureId`, `isPublished`, `publishedAt`),
    INDEX `PredictionRecommendation_competitionId_isPublished_published_idx`(`competitionId`, `isPublished`, `publishedAt`),
    INDEX `PredictionRecommendation_bookmakerId_isPublished_publishedAt_idx`(`bookmakerId`, `isPublished`, `publishedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MonetizationPlacement` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `surface` VARCHAR(191) NOT NULL,
    `slotKey` VARCHAR(191) NOT NULL,
    `placementType` VARCHAR(191) NOT NULL,
    `targetEntityType` VARCHAR(191) NULL,
    `targetEntityId` VARCHAR(191) NULL,
    `bookmakerId` VARCHAR(191) NULL,
    `affiliateLinkId` VARCHAR(191) NULL,
    `funnelEntryId` VARCHAR(191) NULL,
    `predictionRecommendationId` VARCHAR(191) NULL,
    `adSlotId` VARCHAR(191) NULL,
    `shellModuleId` VARCHAR(191) NULL,
    `title` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `priority` INTEGER NOT NULL DEFAULT 100,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `startsAt` DATETIME(3) NULL,
    `endsAt` DATETIME(3) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MonetizationPlacement_key_key`(`key`),
    INDEX `MonetizationPlacement_surface_targetEntityType_targetEntityI_idx`(`surface`, `targetEntityType`, `targetEntityId`, `isActive`, `priority`),
    INDEX `MonetizationPlacement_placementType_surface_isActive_idx`(`placementType`, `surface`, `isActive`),
    INDEX `MonetizationPlacement_slotKey_surface_isActive_idx`(`slotKey`, `surface`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `SourceProvider_role_tier_priority_idx` ON `SourceProvider`(`role`, `tier`, `priority`);

-- CreateIndex
CREATE INDEX `Season_competitionId_startDate_idx` ON `Season`(`competitionId`, `startDate`);

-- CreateIndex
CREATE INDEX `Fixture_sportId_startsAt_idx` ON `Fixture`(`sportId`, `startsAt`);

-- CreateIndex
CREATE INDEX `Fixture_competitionId_startsAt_idx` ON `Fixture`(`competitionId`, `startsAt`);

-- CreateIndex
CREATE INDEX `Fixture_roundId_startsAt_idx` ON `Fixture`(`roundId`, `startsAt`);

-- CreateIndex
CREATE INDEX `Standing_competitionId_seasonId_scope_groupName_position_idx` ON `Standing`(`competitionId`, `seasonId`, `scope`, `groupName`, `position`);

-- CreateIndex
CREATE INDEX `Standing_stageId_scope_groupName_position_idx` ON `Standing`(`stageId`, `scope`, `groupName`, `position`);

-- CreateIndex
CREATE UNIQUE INDEX `Standing_seasonId_teamId_scope_groupName_key` ON `Standing`(`seasonId`, `teamId`, `scope`, `groupName`);

-- CreateIndex
CREATE INDEX `OddsMarket_fixtureId_bookmakerId_idx` ON `OddsMarket`(`fixtureId`, `bookmakerId`);

-- CreateIndex
CREATE INDEX `OddsMarket_bookmakerId_marketType_idx` ON `OddsMarket`(`bookmakerId`, `marketType`);

-- CreateIndex
CREATE INDEX `Incident_teamId_type_idx` ON `Incident`(`teamId`, `type`);

-- CreateIndex
CREATE INDEX `Lineup_teamId_playerId_updatedAt_idx` ON `Lineup`(`teamId`, `playerId`, `updatedAt`);

-- CreateIndex
CREATE INDEX `Statistic_fixtureId_metricKey_sortOrder_idx` ON `Statistic`(`fixtureId`, `metricKey`, `sortOrder`);

-- CreateIndex
CREATE UNIQUE INDEX `BroadcastChannel_fixtureId_externalRef_key` ON `BroadcastChannel`(`fixtureId`, `externalRef`);

-- CreateIndex
CREATE INDEX `ArticleEntityLink_entityType_entityId_publishedAt_idx` ON `ArticleEntityLink`(`entityType`, `entityId`, `publishedAt`);

-- CreateIndex
CREATE INDEX `SyncJob_sourceProviderId_createdAt_idx` ON `SyncJob`(`sourceProviderId`, `createdAt`);

-- CreateIndex
CREATE INDEX `SyncCheckpoint_sourceProviderId_updatedAt_idx` ON `SyncCheckpoint`(`sourceProviderId`, `updatedAt`);

-- AddForeignKey
ALTER TABLE `SourceProvider` ADD CONSTRAINT `SourceProvider_fallbackProviderId_fkey` FOREIGN KEY (`fallbackProviderId`) REFERENCES `SourceProvider`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProviderEntityRef` ADD CONSTRAINT `ProviderEntityRef_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `SourceProvider`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Stage` ADD CONSTRAINT `Stage_competitionId_fkey` FOREIGN KEY (`competitionId`) REFERENCES `Competition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Stage` ADD CONSTRAINT `Stage_seasonId_fkey` FOREIGN KEY (`seasonId`) REFERENCES `Season`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Stage` ADD CONSTRAINT `Stage_parentStageId_fkey` FOREIGN KEY (`parentStageId`) REFERENCES `Stage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Round` ADD CONSTRAINT `Round_competitionId_fkey` FOREIGN KEY (`competitionId`) REFERENCES `Competition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Round` ADD CONSTRAINT `Round_seasonId_fkey` FOREIGN KEY (`seasonId`) REFERENCES `Season`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Round` ADD CONSTRAINT `Round_stageId_fkey` FOREIGN KEY (`stageId`) REFERENCES `Stage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Fixture` ADD CONSTRAINT `Fixture_sportId_fkey` FOREIGN KEY (`sportId`) REFERENCES `Sport`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Fixture` ADD CONSTRAINT `Fixture_stageId_fkey` FOREIGN KEY (`stageId`) REFERENCES `Stage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Fixture` ADD CONSTRAINT `Fixture_roundId_fkey` FOREIGN KEY (`roundId`) REFERENCES `Round`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Standing` ADD CONSTRAINT `Standing_stageId_fkey` FOREIGN KEY (`stageId`) REFERENCES `Stage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Standing` ADD CONSTRAINT `Standing_roundId_fkey` FOREIGN KEY (`roundId`) REFERENCES `Round`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bookmaker` ADD CONSTRAINT `Bookmaker_sourceProviderId_fkey` FOREIGN KEY (`sourceProviderId`) REFERENCES `SourceProvider`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OddsMarket` ADD CONSTRAINT `OddsMarket_bookmakerId_fkey` FOREIGN KEY (`bookmakerId`) REFERENCES `Bookmaker`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Incident` ADD CONSTRAINT `Incident_secondaryPlayerId_fkey` FOREIGN KEY (`secondaryPlayerId`) REFERENCES `Player`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SyncJob` ADD CONSTRAINT `SyncJob_sourceProviderId_fkey` FOREIGN KEY (`sourceProviderId`) REFERENCES `SourceProvider`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SyncCheckpoint` ADD CONSTRAINT `SyncCheckpoint_sourceProviderId_fkey` FOREIGN KEY (`sourceProviderId`) REFERENCES `SourceProvider`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AffiliateLink` ADD CONSTRAINT `AffiliateLink_bookmakerId_fkey` FOREIGN KEY (`bookmakerId`) REFERENCES `Bookmaker`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClickEvent` ADD CONSTRAINT `ClickEvent_affiliateLinkId_fkey` FOREIGN KEY (`affiliateLinkId`) REFERENCES `AffiliateLink`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClickEvent` ADD CONSTRAINT `ClickEvent_bookmakerId_fkey` FOREIGN KEY (`bookmakerId`) REFERENCES `Bookmaker`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClickEvent` ADD CONSTRAINT `ClickEvent_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClickEvent` ADD CONSTRAINT `ClickEvent_fixtureId_fkey` FOREIGN KEY (`fixtureId`) REFERENCES `Fixture`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClickEvent` ADD CONSTRAINT `ClickEvent_competitionId_fkey` FOREIGN KEY (`competitionId`) REFERENCES `Competition`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConversionEvent` ADD CONSTRAINT `ConversionEvent_affiliateLinkId_fkey` FOREIGN KEY (`affiliateLinkId`) REFERENCES `AffiliateLink`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConversionEvent` ADD CONSTRAINT `ConversionEvent_bookmakerId_fkey` FOREIGN KEY (`bookmakerId`) REFERENCES `Bookmaker`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConversionEvent` ADD CONSTRAINT `ConversionEvent_clickEventId_fkey` FOREIGN KEY (`clickEventId`) REFERENCES `ClickEvent`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConversionEvent` ADD CONSTRAINT `ConversionEvent_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConversionEvent` ADD CONSTRAINT `ConversionEvent_fixtureId_fkey` FOREIGN KEY (`fixtureId`) REFERENCES `Fixture`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConversionEvent` ADD CONSTRAINT `ConversionEvent_competitionId_fkey` FOREIGN KEY (`competitionId`) REFERENCES `Competition`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PredictionRecommendation` ADD CONSTRAINT `PredictionRecommendation_sourceProviderId_fkey` FOREIGN KEY (`sourceProviderId`) REFERENCES `SourceProvider`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PredictionRecommendation` ADD CONSTRAINT `PredictionRecommendation_fixtureId_fkey` FOREIGN KEY (`fixtureId`) REFERENCES `Fixture`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PredictionRecommendation` ADD CONSTRAINT `PredictionRecommendation_competitionId_fkey` FOREIGN KEY (`competitionId`) REFERENCES `Competition`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PredictionRecommendation` ADD CONSTRAINT `PredictionRecommendation_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PredictionRecommendation` ADD CONSTRAINT `PredictionRecommendation_bookmakerId_fkey` FOREIGN KEY (`bookmakerId`) REFERENCES `Bookmaker`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MonetizationPlacement` ADD CONSTRAINT `MonetizationPlacement_bookmakerId_fkey` FOREIGN KEY (`bookmakerId`) REFERENCES `Bookmaker`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MonetizationPlacement` ADD CONSTRAINT `MonetizationPlacement_affiliateLinkId_fkey` FOREIGN KEY (`affiliateLinkId`) REFERENCES `AffiliateLink`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MonetizationPlacement` ADD CONSTRAINT `MonetizationPlacement_funnelEntryId_fkey` FOREIGN KEY (`funnelEntryId`) REFERENCES `FunnelEntry`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MonetizationPlacement` ADD CONSTRAINT `MonetizationPlacement_predictionRecommendationId_fkey` FOREIGN KEY (`predictionRecommendationId`) REFERENCES `PredictionRecommendation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MonetizationPlacement` ADD CONSTRAINT `MonetizationPlacement_adSlotId_fkey` FOREIGN KEY (`adSlotId`) REFERENCES `AdSlot`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MonetizationPlacement` ADD CONSTRAINT `MonetizationPlacement_shellModuleId_fkey` FOREIGN KEY (`shellModuleId`) REFERENCES `ShellModule`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

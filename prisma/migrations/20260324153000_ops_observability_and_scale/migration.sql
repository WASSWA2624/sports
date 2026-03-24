CREATE TABLE `OperationalEvent` (
    `id` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `metric` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NULL,
    `route` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL,
    `durationMs` INTEGER NULL,
    `value` DOUBLE NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `OperationalEvent_category_metric_createdAt_idx`(`category`, `metric`, `createdAt`),
    INDEX `OperationalEvent_subject_createdAt_idx`(`subject`, `createdAt`),
    INDEX `OperationalEvent_route_createdAt_idx`(`route`, `createdAt`),
    INDEX `OperationalEvent_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

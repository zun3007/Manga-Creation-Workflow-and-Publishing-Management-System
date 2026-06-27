-- CreateTable
CREATE TABLE `users` (
    `user_id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(150) NOT NULL,
    `avatar_url` VARCHAR(500) NULL,
    `role` ENUM('ADMIN', 'MANGAKA', 'ASSISTANT', 'TANTOU_EDITOR', 'EDITORIAL_BOARD') NOT NULL,
    `is_activated` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `genres` (
    `genre_id` INTEGER NOT NULL AUTO_INCREMENT,
    `genre_name` VARCHAR(100) NOT NULL,

    UNIQUE INDEX `genres_genre_name_key`(`genre_name`),
    PRIMARY KEY (`genre_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mangaka_profiles` (
    `user_id` INTEGER NOT NULL,
    `pen_name` VARCHAR(150) NOT NULL,
    `biography` TEXT NULL,
    `years_experience` INTEGER NOT NULL DEFAULT 0,
    `studio_name` VARCHAR(150) NULL,

    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assistant_profiles` (
    `user_id` INTEGER NOT NULL,
    `salary_rate` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `skill_set` TEXT NULL,
    `total_earnings` DECIMAL(14, 2) NOT NULL DEFAULT 0,

    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tantou_editor_profiles` (
    `user_id` INTEGER NOT NULL,
    `department_name` VARCHAR(150) NULL,
    `specialization` VARCHAR(255) NULL,
    `years_experience` INTEGER NOT NULL DEFAULT 0,
    `managed_series_count` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `editorial_board_profiles` (
    `user_id` INTEGER NOT NULL,
    `department_name` VARCHAR(150) NULL,
    `specialization` VARCHAR(255) NULL,
    `years_experience` INTEGER NOT NULL DEFAULT 0,
    `managed_series_count` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `series_proposals` (
    `proposal_id` INTEGER NOT NULL AUTO_INCREMENT,
    `mangaka_user_id` INTEGER NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `synopsis` TEXT NOT NULL,
    `proposed_status` ENUM('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
    `proposed_frequency` ENUM('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'IRREGULAR') NOT NULL,
    `review_due_date` DATETIME(3) NULL,
    `submitted_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `series_proposals_mangaka_user_id_idx`(`mangaka_user_id`),
    PRIMARY KEY (`proposal_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `proposal_genres` (
    `proposal_id` INTEGER NOT NULL,
    `genre_id` INTEGER NOT NULL,

    PRIMARY KEY (`proposal_id`, `genre_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `series` (
    `series_id` INTEGER NOT NULL AUTO_INCREMENT,
    `proposal_id` INTEGER NOT NULL,
    `mangaka_user_id` INTEGER NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `publication_frequency` ENUM('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'IRREGULAR') NOT NULL,
    `series_status` ENUM('ACTIVE', 'ON_HOLD', 'AT_RISK', 'CANCELLED', 'COMPLETED') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `series_proposal_id_key`(`proposal_id`),
    INDEX `series_mangaka_user_id_idx`(`mangaka_user_id`),
    PRIMARY KEY (`series_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `series_genres` (
    `series_id` INTEGER NOT NULL,
    `genre_id` INTEGER NOT NULL,

    PRIMARY KEY (`series_id`, `genre_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `series_tantou_editors` (
    `series_id` INTEGER NOT NULL,
    `editor_user_id` INTEGER NOT NULL,
    `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `unassigned_at` DATETIME(3) NULL,

    INDEX `series_tantou_editors_editor_user_id_idx`(`editor_user_id`),
    PRIMARY KEY (`series_id`, `editor_user_id`, `assigned_at`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chapters` (
    `chapter_id` INTEGER NOT NULL AUTO_INCREMENT,
    `series_id` INTEGER NOT NULL,
    `chapter_number` INTEGER NOT NULL,
    `chapter_title` VARCHAR(255) NULL,
    `deadline` DATETIME(3) NULL,
    `chapter_status` ENUM('DRAFT', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'REVISION_REQUESTED', 'APPROVED', 'SCHEDULED', 'PUBLISHED') NOT NULL DEFAULT 'DRAFT',
    `is_locked` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `chapters_series_id_chapter_number_key`(`series_id`, `chapter_number`),
    PRIMARY KEY (`chapter_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pages` (
    `page_id` INTEGER NOT NULL AUTO_INCREMENT,
    `chapter_id` INTEGER NOT NULL,
    `page_number` INTEGER NOT NULL,
    `current_version` INTEGER NOT NULL DEFAULT 1,
    `page_status` ENUM('DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'LOCKED') NOT NULL DEFAULT 'DRAFT',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `pages_chapter_id_page_number_key`(`chapter_id`, `page_number`),
    PRIMARY KEY (`page_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `page_versions` (
    `page_version_id` INTEGER NOT NULL AUTO_INCREMENT,
    `page_id` INTEGER NOT NULL,
    `uploaded_by_user_id` INTEGER NOT NULL,
    `version_number` INTEGER NOT NULL,
    `image_url` VARCHAR(500) NOT NULL,
    `upload_note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `page_versions_uploaded_by_user_id_idx`(`uploaded_by_user_id`),
    UNIQUE INDEX `page_versions_page_id_version_number_key`(`page_id`, `version_number`),
    PRIMARY KEY (`page_version_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `manuscripts` (
    `manuscript_id` INTEGER NOT NULL AUTO_INCREMENT,
    `chapter_id` INTEGER NOT NULL,
    `uploaded_by_user_id` INTEGER NOT NULL,
    `version_number` INTEGER NOT NULL,
    `file_url` VARCHAR(500) NOT NULL,
    `manuscript_status` ENUM('DRAFT', 'SUBMITTED', 'REVISION_REQUESTED', 'APPROVED') NOT NULL DEFAULT 'DRAFT',
    `uploaded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `manuscripts_uploaded_by_user_id_idx`(`uploaded_by_user_id`),
    UNIQUE INDEX `manuscripts_chapter_id_version_number_key`(`chapter_id`, `version_number`),
    PRIMARY KEY (`manuscript_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `regions` (
    `region_id` INTEGER NOT NULL AUTO_INCREMENT,
    `page_id` INTEGER NOT NULL,
    `page_version_id` INTEGER NOT NULL,
    `region_type` ENUM('PANEL', 'CHARACTER', 'BACKGROUND', 'SPEECH_BUBBLE', 'EFFECT', 'LINE_ART', 'COLORING', 'OTHER') NOT NULL,
    `x_coordinate` DECIMAL(10, 6) NOT NULL,
    `y_coordinate` DECIMAL(10, 6) NOT NULL,
    `width` DECIMAL(10, 6) NOT NULL,
    `height` DECIMAL(10, 6) NOT NULL,
    `z_index` INTEGER NOT NULL DEFAULT 0,
    `ai_suggested` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `regions_page_id_idx`(`page_id`),
    INDEX `regions_page_version_id_idx`(`page_version_id`),
    PRIMARY KEY (`region_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task_price_rules` (
    `rule_id` INTEGER NOT NULL AUTO_INCREMENT,
    `created_by_user_id` INTEGER NOT NULL,
    `rule_name` VARCHAR(150) NOT NULL,
    `region_type` ENUM('PANEL', 'CHARACTER', 'BACKGROUND', 'SPEECH_BUBBLE', 'EFFECT', 'LINE_ART', 'COLORING', 'OTHER') NOT NULL,
    `base_price` DECIMAL(12, 2) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `effective_from` DATETIME(3) NOT NULL,
    `effective_to` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `task_price_rules_created_by_user_id_idx`(`created_by_user_id`),
    PRIMARY KEY (`rule_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tasks` (
    `task_id` INTEGER NOT NULL AUTO_INCREMENT,
    `region_id` INTEGER NOT NULL,
    `page_id` INTEGER NOT NULL,
    `assignor_user_id` INTEGER NOT NULL,
    `assignee_user_id` INTEGER NOT NULL,
    `task_price_rule_id` INTEGER NULL,
    `task_description` VARCHAR(500) NOT NULL,
    `instruction` TEXT NULL,
    `deadline` DATETIME(3) NULL,
    `task_status` ENUM('ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'REVISION_REQUESTED', 'APPROVED', 'CANCELLED') NOT NULL DEFAULT 'ASSIGNED',
    `payment_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `tasks_region_id_idx`(`region_id`),
    INDEX `tasks_page_id_idx`(`page_id`),
    INDEX `tasks_assignor_user_id_idx`(`assignor_user_id`),
    INDEX `tasks_assignee_user_id_idx`(`assignee_user_id`),
    INDEX `tasks_task_price_rule_id_idx`(`task_price_rule_id`),
    PRIMARY KEY (`task_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `submissions` (
    `submission_id` INTEGER NOT NULL AUTO_INCREMENT,
    `task_id` INTEGER NOT NULL,
    `page_id` INTEGER NOT NULL,
    `assistant_user_id` INTEGER NOT NULL,
    `reviewed_by_user_id` INTEGER NULL,
    `version_number` INTEGER NOT NULL,
    `file_url` VARCHAR(500) NOT NULL,
    `submission_status` ENUM('SUBMITTED', 'REVISION_REQUESTED', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'SUBMITTED',
    `feedback` TEXT NULL,
    `submitted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewed_at` DATETIME(3) NULL,

    INDEX `submissions_page_id_idx`(`page_id`),
    INDEX `submissions_assistant_user_id_idx`(`assistant_user_id`),
    INDEX `submissions_reviewed_by_user_id_idx`(`reviewed_by_user_id`),
    UNIQUE INDEX `submissions_task_id_version_number_key`(`task_id`, `version_number`),
    PRIMARY KEY (`submission_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `publication_schedules` (
    `schedule_id` INTEGER NOT NULL AUTO_INCREMENT,
    `chapter_id` INTEGER NOT NULL,
    `scheduled_by_user_id` INTEGER NOT NULL,
    `release_date` DATETIME(3) NOT NULL,
    `publish_status` ENUM('SCHEDULED', 'PUBLISHED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
    `scheduled_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `published_at` DATETIME(3) NULL,

    INDEX `publication_schedules_chapter_id_idx`(`chapter_id`),
    INDEX `publication_schedules_scheduled_by_user_id_idx`(`scheduled_by_user_id`),
    PRIMARY KEY (`schedule_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vote_periods` (
    `vote_period_id` INTEGER NOT NULL AUTO_INCREMENT,
    `series_id` INTEGER NOT NULL,
    `ranking_period_type` ENUM('WEEKLY', 'MONTHLY') NOT NULL,
    `period_start_date` DATETIME(3) NOT NULL,
    `period_end_date` DATETIME(3) NOT NULL,
    `status` ENUM('OPEN', 'CLOSED', 'CALCULATED') NOT NULL DEFAULT 'OPEN',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `vote_periods_series_id_ranking_period_type_period_start_date_key`(`series_id`, `ranking_period_type`, `period_start_date`, `period_end_date`),
    PRIMARY KEY (`vote_period_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `votes` (
    `vote_id` INTEGER NOT NULL AUTO_INCREMENT,
    `vote_period_id` INTEGER NOT NULL,
    `board_user_id` INTEGER NOT NULL,
    `score` DECIMAL(5, 2) NOT NULL,
    `comment` TEXT NULL,
    `voted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `votes_board_user_id_idx`(`board_user_id`),
    UNIQUE INDEX `votes_vote_period_id_board_user_id_key`(`vote_period_id`, `board_user_id`),
    PRIMARY KEY (`vote_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rankings` (
    `ranking_id` INTEGER NOT NULL AUTO_INCREMENT,
    `series_id` INTEGER NOT NULL,
    `vote_period_id` INTEGER NOT NULL,
    `total_score` DECIMAL(10, 2) NOT NULL,
    `risk_level` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL,
    `calculated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `rankings_vote_period_id_key`(`vote_period_id`),
    INDEX `rankings_series_id_idx`(`series_id`),
    PRIMARY KEY (`ranking_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `decisions` (
    `decision_id` INTEGER NOT NULL AUTO_INCREMENT,
    `series_id` INTEGER NOT NULL,
    `ranking_id` INTEGER NOT NULL,
    `decided_by_user_id` INTEGER NOT NULL,
    `decision_type` ENUM('CONTINUE', 'CHANGE_FREQUENCY', 'PAUSE', 'CANCEL') NOT NULL,
    `new_frequency` ENUM('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'IRREGULAR') NULL,
    `reason` TEXT NULL,
    `decided_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `decisions_series_id_idx`(`series_id`),
    INDEX `decisions_ranking_id_idx`(`ranking_id`),
    INDEX `decisions_decided_by_user_id_idx`(`decided_by_user_id`),
    PRIMARY KEY (`decision_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `annotations` (
    `annotation_id` INTEGER NOT NULL AUTO_INCREMENT,
    `created_by_user_id` INTEGER NOT NULL,
    `target_type` ENUM('PROPOSAL', 'CHAPTER', 'PAGE', 'PAGE_VERSION', 'REGION', 'SUBMISSION') NOT NULL,
    `target_id` INTEGER NOT NULL,
    `annotation_category` ENUM('CONTENT', 'DIALOGUE', 'SCRIPT', 'VISUAL', 'OTHER') NOT NULL,
    `content` TEXT NOT NULL,
    `x_coordinate` DECIMAL(10, 6) NULL,
    `y_coordinate` DECIMAL(10, 6) NULL,
    `is_resolved` BOOLEAN NOT NULL DEFAULT false,
    `resolved_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `annotations_created_by_user_id_idx`(`created_by_user_id`),
    INDEX `annotations_target_type_target_id_idx`(`target_type`, `target_id`),
    PRIMARY KEY (`annotation_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `earning_disputes` (
    `dispute_id` INTEGER NOT NULL AUTO_INCREMENT,
    `assistant_user_id` INTEGER NOT NULL,
    `task_id` INTEGER NOT NULL,
    `resolved_by_user_id` INTEGER NULL,
    `dispute_reason` TEXT NOT NULL,
    `expected_amount` DECIMAL(12, 2) NOT NULL,
    `dispute_status` ENUM('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED') NOT NULL DEFAULT 'OPEN',
    `resolution_note` TEXT NULL,
    `resolved_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `earning_disputes_assistant_user_id_idx`(`assistant_user_id`),
    INDEX `earning_disputes_task_id_idx`(`task_id`),
    INDEX `earning_disputes_resolved_by_user_id_idx`(`resolved_by_user_id`),
    PRIMARY KEY (`dispute_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `notification_id` INTEGER NOT NULL AUTO_INCREMENT,
    `recipient_user_id` INTEGER NOT NULL,
    `notification_type` ENUM('TASK_ASSIGNED', 'SUBMISSION_RECEIVED', 'REVISION_REQUESTED', 'TASK_APPROVED', 'CHAPTER_REVIEW_REQUIRED', 'PROPOSAL_DECISION', 'RANKING_UPDATED', 'RISK_ALERT', 'DISPUTE_UPDATED', 'SYSTEM') NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `content` TEXT NOT NULL,
    `related_entity_type` VARCHAR(100) NULL,
    `related_entity_id` INTEGER NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `read_at` DATETIME(3) NULL,

    INDEX `notifications_recipient_user_id_is_read_idx`(`recipient_user_id`, `is_read`),
    PRIMARY KEY (`notification_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `log_id` INTEGER NOT NULL AUTO_INCREMENT,
    `actor_user_id` INTEGER NULL,
    `action` VARCHAR(150) NOT NULL,
    `entity_type` VARCHAR(100) NOT NULL,
    `entity_id` INTEGER NULL,
    `before_value` JSON NULL,
    `after_value` JSON NULL,
    `ip_address` VARCHAR(64) NULL,
    `user_agent` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_actor_user_id_idx`(`actor_user_id`),
    INDEX `audit_logs_entity_type_entity_id_idx`(`entity_type`, `entity_id`),
    PRIMARY KEY (`log_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_configs` (
    `config_key` VARCHAR(150) NOT NULL,
    `updated_by_user_id` INTEGER NULL,
    `config_value` TEXT NOT NULL,
    `description` TEXT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `system_configs_updated_by_user_id_idx`(`updated_by_user_id`),
    PRIMARY KEY (`config_key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `mangaka_profiles` ADD CONSTRAINT `mangaka_profiles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assistant_profiles` ADD CONSTRAINT `assistant_profiles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tantou_editor_profiles` ADD CONSTRAINT `tantou_editor_profiles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `editorial_board_profiles` ADD CONSTRAINT `editorial_board_profiles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `series_proposals` ADD CONSTRAINT `series_proposals_mangaka_user_id_fkey` FOREIGN KEY (`mangaka_user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `proposal_genres` ADD CONSTRAINT `proposal_genres_proposal_id_fkey` FOREIGN KEY (`proposal_id`) REFERENCES `series_proposals`(`proposal_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `proposal_genres` ADD CONSTRAINT `proposal_genres_genre_id_fkey` FOREIGN KEY (`genre_id`) REFERENCES `genres`(`genre_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `series` ADD CONSTRAINT `series_proposal_id_fkey` FOREIGN KEY (`proposal_id`) REFERENCES `series_proposals`(`proposal_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `series` ADD CONSTRAINT `series_mangaka_user_id_fkey` FOREIGN KEY (`mangaka_user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `series_genres` ADD CONSTRAINT `series_genres_series_id_fkey` FOREIGN KEY (`series_id`) REFERENCES `series`(`series_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `series_genres` ADD CONSTRAINT `series_genres_genre_id_fkey` FOREIGN KEY (`genre_id`) REFERENCES `genres`(`genre_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `series_tantou_editors` ADD CONSTRAINT `series_tantou_editors_series_id_fkey` FOREIGN KEY (`series_id`) REFERENCES `series`(`series_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `series_tantou_editors` ADD CONSTRAINT `series_tantou_editors_editor_user_id_fkey` FOREIGN KEY (`editor_user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chapters` ADD CONSTRAINT `chapters_series_id_fkey` FOREIGN KEY (`series_id`) REFERENCES `series`(`series_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pages` ADD CONSTRAINT `pages_chapter_id_fkey` FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`chapter_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `page_versions` ADD CONSTRAINT `page_versions_page_id_fkey` FOREIGN KEY (`page_id`) REFERENCES `pages`(`page_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `page_versions` ADD CONSTRAINT `page_versions_uploaded_by_user_id_fkey` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `manuscripts` ADD CONSTRAINT `manuscripts_chapter_id_fkey` FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`chapter_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `manuscripts` ADD CONSTRAINT `manuscripts_uploaded_by_user_id_fkey` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `regions` ADD CONSTRAINT `regions_page_id_fkey` FOREIGN KEY (`page_id`) REFERENCES `pages`(`page_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `regions` ADD CONSTRAINT `regions_page_version_id_fkey` FOREIGN KEY (`page_version_id`) REFERENCES `page_versions`(`page_version_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_price_rules` ADD CONSTRAINT `task_price_rules_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_region_id_fkey` FOREIGN KEY (`region_id`) REFERENCES `regions`(`region_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_page_id_fkey` FOREIGN KEY (`page_id`) REFERENCES `pages`(`page_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_assignor_user_id_fkey` FOREIGN KEY (`assignor_user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_assignee_user_id_fkey` FOREIGN KEY (`assignee_user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_task_price_rule_id_fkey` FOREIGN KEY (`task_price_rule_id`) REFERENCES `task_price_rules`(`rule_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submissions` ADD CONSTRAINT `submissions_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`task_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submissions` ADD CONSTRAINT `submissions_page_id_fkey` FOREIGN KEY (`page_id`) REFERENCES `pages`(`page_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submissions` ADD CONSTRAINT `submissions_assistant_user_id_fkey` FOREIGN KEY (`assistant_user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submissions` ADD CONSTRAINT `submissions_reviewed_by_user_id_fkey` FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `publication_schedules` ADD CONSTRAINT `publication_schedules_chapter_id_fkey` FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`chapter_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `publication_schedules` ADD CONSTRAINT `publication_schedules_scheduled_by_user_id_fkey` FOREIGN KEY (`scheduled_by_user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vote_periods` ADD CONSTRAINT `vote_periods_series_id_fkey` FOREIGN KEY (`series_id`) REFERENCES `series`(`series_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `votes` ADD CONSTRAINT `votes_vote_period_id_fkey` FOREIGN KEY (`vote_period_id`) REFERENCES `vote_periods`(`vote_period_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `votes` ADD CONSTRAINT `votes_board_user_id_fkey` FOREIGN KEY (`board_user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rankings` ADD CONSTRAINT `rankings_series_id_fkey` FOREIGN KEY (`series_id`) REFERENCES `series`(`series_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rankings` ADD CONSTRAINT `rankings_vote_period_id_fkey` FOREIGN KEY (`vote_period_id`) REFERENCES `vote_periods`(`vote_period_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `decisions` ADD CONSTRAINT `decisions_series_id_fkey` FOREIGN KEY (`series_id`) REFERENCES `series`(`series_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `decisions` ADD CONSTRAINT `decisions_ranking_id_fkey` FOREIGN KEY (`ranking_id`) REFERENCES `rankings`(`ranking_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `decisions` ADD CONSTRAINT `decisions_decided_by_user_id_fkey` FOREIGN KEY (`decided_by_user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `annotations` ADD CONSTRAINT `annotations_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `earning_disputes` ADD CONSTRAINT `earning_disputes_assistant_user_id_fkey` FOREIGN KEY (`assistant_user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `earning_disputes` ADD CONSTRAINT `earning_disputes_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`task_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `earning_disputes` ADD CONSTRAINT `earning_disputes_resolved_by_user_id_fkey` FOREIGN KEY (`resolved_by_user_id`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_recipient_user_id_fkey` FOREIGN KEY (`recipient_user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actor_user_id_fkey` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `system_configs` ADD CONSTRAINT `system_configs_updated_by_user_id_fkey` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

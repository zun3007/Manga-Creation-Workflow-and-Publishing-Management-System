-- Note: CHUA THEM TEN CONSTRAINT
-- =========================================================================================================================
-- ========================================================= CONFIG ========================================================
-- =========================================================================================================================

-- DROP DATABASE IF EXISTS
DROP DATABASE IF EXISTS `manga_creation_workflow_and_publishing_management_system`;

-- CREATE DATABASE
CREATE DATABASE `manga_creation_workflow_and_publishing_management_system`;
USE `manga_creation_workflow_and_publishing_management_system`;





-- =========================================================================================================================
-- ========================================================= TABLE =========================================================
-- =========================================================================================================================

-- ========================== 1. User & Profile ==========================
-- User 
CREATE TABLE `User` (
	`user_id` BIGINT AUTO_INCREMENT,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(100) NOT NULL,
    `avatar_url` VARCHAR(500),
    `role` ENUM('MANGAKA', 'ASSISTANT', 'TANTOU_EDITOR', 'EDITORIAL_BOARD', 'ADMIN'),
    `is_activated` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME NOT NULL DEFAULT current_timestamp,
    `updated_at` DATETIME NOT NULL DEFAULT current_timestamp ON UPDATE current_timestamp,
    
     PRIMARY KEY (`user_id`),
     UNIQUE KEY `uq_user_email` (`email`),
     INDEX `idx_user_role` (`role`)
);
 
-- Mangaka Profile
CREATE TABLE `Mangaka_Profile` (
	`user_id` BIGINT,
    `pen_name` VARCHAR(100) NOT NULL,
    `biography` TEXT,
    `years_experrence` INT NOT NULL DEFAULT 0,
    `studio_name` VARCHAR(100),
    `social_link` VARCHAR(500),
    
    PRIMARY KEY (`user_id`),
    FOREIGN KEY (`user_id`) REFERENCES `User`(`user_id`) ON DELETE CASCADE
);

-- Assistant_Profile
CREATE TABLE `Assistant_Profile` (
	`user_id` BIGINT,
    `salary_rate` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `skill_set` VARCHAR(500), 							-- Ex: background, shading, effect, ..
    `total_earnings` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    
    PRIMARY KEY (`user_id`),
    FOREIGN KEY (`user_id`) REFERENCES `User`(`user_id`) ON DELETE CASCADE
);

-- Tantou_Editor_Profile
CREATE TABLE `Tantou_Editor_Profile` (
	`user_id` BIGINT,
    `department_name` VARCHAR(100),
    `specialization` VARCHAR(100),						-- Ex: Shonen / Shojo / Seinen...
    `years_experience` INT NOT NULL DEFAULT 0,
    `managed_series_count` INT NOT NULL DEFAULT 0,
    
    PRIMARY KEY (`user_id`),
    FOREIGN KEY (`user_id`) REFERENCES `User`(`user_id`) ON DELETE CASCADE
);

-- Editorial_Board_Profile
CREATE TABLE `Editorial_Board_Profile` (
	`user_id` BIGINT,
    `position` VARCHAR(100),
    `seniority_level` INT NOT NULL DEFAULT 1,
    `voting_power` INT NOT NULL DEFAULT 1,
    `joined_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (`user_id`),
    FOREIGN KEY (`user_id`) REFERENCES `User`(`user_id`) ON DELETE CASCADE
);

-- ========================== 2. Genre & Series ==========================
-- Genre
CREATE TABLE `Genre` (
	`genre_id` BIGINT AUTO_INCREMENT,
    `genre_name` VARCHAR(50) NOT NULL,
    
    PRIMARY KEY (`genre_id`),
    UNIQUE KEY (`genre_name`)
);

-- Series_Proposal
CREATE TABLE `Series_Proposal` (
	`proposal_id` BIGINT AUTO_INCREMENT,
    `mangaka_user_id` BIGINT,
    `title` VARCHAR(200) NOT NULL,
    `synopsis` TEXT,
    `proposal_status` ENUM('DRAFT','SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED') NOT NULL DEFAULT 'DRAFT',
    `proposed_frequency` ENUM('WEEKLY','MONTHLY') NOT NULL,
    `review_due_date` DATE,
    `submitted_at` DATETIME,
	`created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    PRIMARY KEY (`proposal_id`),
    FOREIGN KEY (`mangaka_user_id`) REFERENCES `User`(`user_id`),
    INDEX `idx_proposal_status` (`proposal_status`),
    INDEX `idx_proposal_mangaka` (`mangaka_user_id`)
);

-- Proposal_Genre (bridge M-M)
CREATE TABLE `Proposal_Genre` (
	`proposal_id` BIGINT,
    `genre_id` BIGINT,
    
    PRIMARY KEY (`proposal_id`, `genre_id`),
    FOREIGN KEY (`proposal_id`) REFERENCES `Series_Proposal`(`proposal_id`) ON DELETE CASCADE,
    FOREIGN KEY (`genre_id`) REFERENCES `Genre`(`genre_id`)
);

-- Series
CREATE TABLE `Series` (
	`series_id` BIGINT AUTO_INCREMENT,
    `proposal_id` BIGINT,
    `mangaka_user_id` BIGINT,
    `title` VARCHAR(200) NOT NULL,
    `publication_frequency` ENUM('WEEKLY','MONTHLY') NOT NULL, 
    `series_status` ENUM('ACTIVE','AT_RISK','HIATUS','CANCELLED','COMPLETED') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
	PRIMARY KEY (`series_id`),
    FOREIGN KEY (`proposal_id`) REFERENCES `Series_Proposal`(`proposal_id`),
    FOREIGN KEY (`mangaka_user_id`) REFERENCES `User`(`user_id`),
    UNIQUE KEY (`proposal_id`),
    INDEX `idx_series_status` (`series_status`),
    INDEX `idx_series_mangaka` (`mangaka_user_id`)
);

-- Series_Genre (bridge M-M)
CREATE TABLE `Series_Genre` (
	`series_id` BIGINT,
    `genre_id` BIGINT,
    
    PRIMARY KEY (`series_id`, `genre_id`),
    FOREIGN KEY (`series_id`) REFERENCES `Series`(`series_id`) ON DELETE CASCADE,
    FOREIGN KEY (`genre_id`) REFERENCES `Genre`(`genre_id`)
);

-- Series_Tantou_Editor
CREATE TABLE `Series_Tantou_Editor` (
	`series_id` BIGINT,
    `editor_user_id` BIGINT,
    `assigned_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `unassigned_at` DATETIME,
    
    PRIMARY KEY (`series_id`, `editor_user_id`, `assigned_at`),
    FOREIGN KEY (`series_id`) REFERENCES `Series`(`series_id`),
    FOREIGN KEY (`editor_user_id`) REFERENCES `User`(`user_id`),
    INDEX `idx_ste_active` (`series_id`, `unassigned_at`)
);

-- ========================== 3. Chapter, Page, Manuscript, Region ==========================
-- CHAPTER
CREATE TABLE `Chapter` (
	`chapter_id` BIGINT AUTO_INCREMENT,
    `series_id` BIGINT,
    `chapter_number` INT NOT NULL,
    `chapter_title` VARCHAR(200) NOT NULL,
    `deadline` DATETIME,
    `chapter_status` ENUM('DRAFT','IN_PROGRESS','READY_FOR_EDITOR_REVIEW','EDITOR_APPROVED','PUBLISHED') NOT NULL DEFAULT 'DRAFT',
	`is_locked` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    PRIMARY KEY (`chapter_id`),
    FOREIGN KEY (`series_id`) REFERENCES `Series`(`series_id`),
    UNIQUE KEY `uq_chapter_number` (`series_id`, `chapter_number`),
    INDEX `idx_chapter_status` (`chapter_status`)
);

-- PAGE 
CREATE TABLE `Page`(
	`page_id` BIGINT AUTO_INCREMENT,
    `chapter_id` BIGINT,
    `page_number` INT NOT NULL,
    `current_version` INT NOT NULL DEFAULT 1,
    `page_status` ENUM('RAW','ASSIGNED','IN_PROGRESS','REVIEWING','COMPLETED') NOT NULL DEFAULT 'RAW',
	`created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

	PRIMARY KEY (`page_id`),
    FOREIGN KEY (`chapter_id`) REFERENCES `Chapter`(`chapter_id`),
	UNIQUE KEY `uq_page_number` (`chapter_id`, `page_number`)
);

-- Page_Version
CREATE TABLE `Page_Version` (
	`page_version_id` BIGINT AUTO_INCREMENT,
    `page_id` BIGINT,
    `version_number` INT NOT NULL,
    `image_url` VARCHAR(500) NOT NULL,
    `uploaded_by_user_id` BIGINT,
    `upload_note` VARCHAR(500),
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (`page_version_id`),
	FOREIGN KEY (`page_id`) REFERENCES `Page`(`page_id`) ON DELETE CASCADE, 
    FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `User`(`user_id`),
    UNIQUE KEY `uq_page_version` (`page_id`, `version_number`)
);

-- Manuscript
CREATE TABLE `Manuscript` (
	`manuscript_id` BIGINT AUTO_INCREMENT,
	`chapter_id` BIGINT,
    `version_number` INT NOT NULL,
    `file_url` VARCHAR(500) NOT NULL,
    `manuscript_status` ENUM('DRAFT','REVIEWING','FINAL') NOT NULL DEFAULT 'DRAFT',
    `uploaded_by_user_id` BIGINT,
	`uploaded_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	
	PRIMARY KEY (`manuscript_id`),
    FOREIGN KEY (`chapter_id`) REFERENCES `Chapter`(`chapter_id`),
    FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `User`(`user_id`),
	UNIQUE KEY `uq_manuscript_version` (`chapter_id`, `version_number`)
);

-- Region
CREATE TABLE `Region` (
	`region_id` BIGINT AUTO_INCREMENT,
    `page_id` BIGINT,
    `page_version_id` BIGINT,
    `region_type` ENUM('PANEL','BACKGROUND','CHARACTER','DIALOGUE_BUBBLE','EFFECT') NOT NULL,
    `x_coordinate` DECIMAL(10, 4) NOT NULL,
    `y_coordinate` DECIMAL(10, 4) NOT NULL,
    `width` DECIMAL(10, 4) NOT NULL,
    `height` DECIMAL(10, 4) NOT NULL,
    `z-index` INT NOT NULL DEFAULT 0,
    `ai_suggested` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `uploaded_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    PRIMARY KEY (`region_id`),
    FOREIGN KEY (`page_id`) REFERENCES `Page`(`page_id`),
    FOREIGN KEY (`page_version_id`) REFERENCES `Page_Version`(`page_version_id`),
    INDEX `idx_region_page` (`page_id`),
    INDEX `idx_region_page_version` (`page_version_id`)
);

-- ========================== 4. Task & Submission ==========================
-- Task_Price_Rule 
CREATE TABLE `Task_Price_Rule` (
	`rule_id` BIGINT,
    `rule_name` VARCHAR(100) NOT NULL,
	`region_type` ENUM('PANEL','BACKGROUND','CHARACTER','DIALOGUE_BUBBLE','EFFECT') NOT NULL,
    `base_price` DECIMAL(10, 2) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
    `effective_from` DATE NOT NULL,
    `effective_to` DATE,
    `created_by_user_id` BIGINT,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (`rule_id`),
    FOREIGN KEY (`created_by_user_id`) REFERENCES `User`(`user_id`),
    INDEX `idx_task_price_active` (`region_type`, `is_active`)
);

-- Task
CREATE TABLE `Task` (
	`task_id` BIGINT AUTO_INCREMENT,
    `region_id` BIGINT,
    `page_id` BIGINT, 
    `assignor_user_id` BIGINT,
    `assignee_user_id` BIGINT,
    `task_description` TEXT,
    `instruction` TEXT,
    `deadline` DATETIME,
    `task_status` ENUM('ASSIGNED','IN_PROGRESS','SUBMITTED','REVISION_REQUIRED','APPROVED') NOT NULL DEFAULT 'ASSIGNED',
    `payment_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `task_price_rule_id` BIGINT,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `uploaded_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

	PRIMARY KEY (`task_id`),
	FOREIGN KEY (`region_id`) REFERENCES `Region`(`region_id`),
	FOREIGN KEY (`page_id`) REFERENCES `Page`(`page_id`),
    FOREIGN KEY (`assignor_user_id`) REFERENCES `User`(`user_id`),
    FOREIGN KEY (`assignee_user_id`) REFERENCES `User`(`user_id`),
    FOREIGN KEY (`task_price_rule_id`) REFERENCES `Task_Price_Rule`(`rule_id`),
    INDEX `idx_task_assignee_status` (`assignee_user_id`, `task_status`),
    INDEX `idx_task_region` (`region_id`),
    INDEX `idx_task_page` (`page_id`)
);

-- Submission
CREATE TABLE `Submission` (
	`submission_id` BIGINT AUTO_INCREMENT,
    `task_id` BIGINT,
    `page_id` BIGINT,
    `assistant_user_id` BIGINT,
    `version_number` INT NOT NULL,
    `file_url` VARCHAR(500) NOT NULL,
    `version_note` VARCHAR(500),
    `submission_status` ENUM('PENDING','UNDER_REVIEW','REVISION_REQUIRED','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
    `feedback` TEXT,
    `submitted_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `reviewed_by_user_id` BIGINT,
    `reviewed_at` DATETIME,
    
    PRIMARY KEY (`submission_id`),
    FOREIGN KEY (`task_id`) REFERENCES `Task`(`task_id`),
    FOREIGN KEY (`page_id`) REFERENCES `Page`(`page_id`),
    FOREIGN KEY (`assistant_user_id`) REFERENCES `User`(`user_id`),
    FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `User`(`user_id`),
    UNIQUE KEY `uq_submission_version` (`task_id`, `version_number`),
    INDEX `idx_submission_task` (`task_id`),
    INDEX `idx_submission_status` (`submission_status`)
);

-- ========================== 5. Annotation ==========================
-- Annotation 
CREATE TABLE `Annotation` (
	`annotation_id` BIGINT AUTO_INCREMENT,
    `target_type` ENUM('PAGE','MANUSCRIPT','SUBMISSION') NOT NULL,
    `target_id` BIGINT NOT NULL,
    `created_by_user_id` BIGINT,
    `annotation_category` ENUM('CONTENT_ISSUE','DIALOGUE_ISSUE','SCRIPT_ISSUE','VISUAL_ISSUE','GENERAL') 
		NOT NULL DEFAULT 'GENERAL',
	`context` TEXT NOT NULL,
    `x_coordinate` DECIMAL(10, 4),
    `y_coordinate` DECIMAL(10, 4),
    `is_resolved` BOOLEAN NOT NULL DEFAULT FALSE,
    `resolved_at` DATETIME,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (`annotation_id`),
    FOREIGN KEY (`created_by_user_id`) REFERENCES `User`(`user_id`),
    INDEX `idx_annotation_target` (`target_type`, `target_id`)
    );

-- ========================== 6. Publishing ==========================
-- Publication_Schedule
CREATE TABLE `Publication_Schedule` (
	`schedule_id` BIGINT AUTO_INCREMENT,
    `chapter_id` BIGINT,
	`release_date` DATETIME NOT NULL,
    `publish_status` ENUM('SCHEDULED','PUBLISHED','CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
    `scheduled_by_user_id` BIGINT,
    `scheduled_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `published_at` DATETIME,
    
    PRIMARY KEY (`schedule_id`),
    FOREIGN KEY (`chapter_id`) REFERENCES `Chapter`(`chapter_id`),
    FOREIGN KEY (`scheduled_by_user_id`) REFERENCES `User`(`user_id`),
    UNIQUE KEY (`chapter_id`)
);

-- ========================== 7. Voting, Ranking, Decision ==========================
-- Vote_Period 
CREATE TABLE `Vote_Period` (
	`vote_period_id` BIGINT AUTO_INCREMENT,
    `series_id` BIGINT,
    `ranking_period_type` ENUM('WEEKLY','MONTHLY') NOT NULL,
    `period_start_date` DATE NOT NULL,
    `period_end_date` DATE NOT NULL,
    `status` ENUM ('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (`vote_period_id`),
    FOREIGN KEY (`series_id`) REFERENCES `Series`(`series_id`),
    UNIQUE KEY `uq_vote_period` (`series_id`, `ranking_period_type`, `period_start_date`)
);

-- Vote 
CREATE TABLE `Vote` (
	`vote_id` BIGINT AUTO_INCREMENT,
    `vote_period_id` BIGINT,
    `board_user_id` BIGINT,
    `score` DECIMAL(5, 2) NOT NULL,
    `comment` TEXT,
    `voted_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (`vote_id`),
    FOREIGN KEY (`vote_period_id`) REFERENCES `Vote_Period`(`vote_period_id`),
    FOREIGN KEY (`board_user_id`) REFERENCES `User`(`user_id`),
    UNIQUE KEY `uq_vote_per_period` (`vote_period_id`, `board_user_id`) 
); 

-- Ranking
CREATE TABLE `Ranking` (
	`ranking_id` BIGINT AUTO_INCREMENT,
    `series_id` BIGINT,
    `vote_period_id` BIGINT,
    `rank_position` INT NOT NULL,
    `total_score` DECIMAL(10, 2) NOT NULL,
    `risk_level` ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL,
    `calculated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (`ranking_id`),
    FOREIGN KEY (`series_id`) REFERENCES `Series`(`series_id`),
    FOREIGN KEY (`vote_period_id`) REFERENCES `Vote_Period`(`vote_period_id`),
    UNIQUE KEY `uq_ranking` (`series_id`, `vote_period_id`)
);

-- Decision 
CREATE TABLE `Decision` (
	`decision_id` BIGINT AUTO_INCREMENT,
    `series_id` BIGINT,
    `ranking_id`BIGINT,
    `decision_type` ENUM('CONTINUE','CANCEL','CHANGE_FREQUENCY','HIATUS') NOT NULL,
    `new_frequency` ENUM('WEEKLY', 'MONTHLY'),
    `reason` TEXT NOT NULL,
    `decided_by_user_id` BIGINT,
    `decided_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (`decision_id`),
    FOREIGN KEY (`series_id`) REFERENCES `Series`(`series_id`),
    FOREIGN KEY (`ranking_id`) REFERENCES `Ranking`(`ranking_id`),
    FOREIGN KEY (`decided_by_user_id`) REFERENCES `User`(`user_id`),
    INDEX `idx_decision_series` (`series_id`),
    INDEX `idx_decision_type` (`decision_type`)
);

-- ========================== 8. Earnings & Dispute ==========================
-- Earning_Dispute 
CREATE TABLE `Earning_Dispute` (
	`dispute_id` BIGINT AUTO_INCREMENT,
    `assistant_user_id` BIGINT,
    `task_id` BIGINT,
    `dispute_reason` TEXT NOT NULL,
    `expected_amount` DECIMAL(10, 2),
    `dispute_status` ENUM('OPEN','UNDER_REVIEW','RESOLVED','REJECTED') NOT NULL DEFAULT 'OPEN',
    `resolution_note` TEXT,
    `resolved_by_user_id` BIGINT,
    `resolved_at` DATETIME,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (`dispute_id`),
	FOREIGN KEY (`assistant_user_id`) REFERENCES `User`(`user_id`),
    FOREIGN KEY (`task_id`) REFERENCES `Task`(`task_id`),
    FOREIGN KEY (`resolved_by_user_id`) REFERENCES `User`(`user_id`),
    INDEX `idx_dispute_assistant_status` (`assistant_user_id`, `dispute_status`)
);

-- ========================== 9. Notification ==========================
-- Notification 
CREATE TABLE `Notification` (
	`notification_id` BIGINT AUTO_INCREMENT,
    `recipient_user_id` BIGINT,
    `notification_type` ENUM('DEADLINE','TASK_ASSIGNMENT','SUBMISSION',
							'REVISION','REVIEW','PROPOSAL_DECISION',
							'RISK_ALERT','DECISION','DISPUTE','GENERAL') NOT NULL,
	`title` VARCHAR(200) NOT NULL,
    `content` TEXT,
    `related_entity_type` VARCHAR(50),
    `related_entity_id` BIGINT,
    `is_read` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `read_at` DATETIME,
    
    PRIMARY KEY (`notification_id`),
    FOREIGN KEY (`recipient_user_id`) REFERENCES `User`(`user_id`),
    INDEX `idx_notification_recipient_read` (`recipient_user_id`, `is_read`)
); 


-- ========================== 10. Audit & System Configuration ==========================
-- Audit_Log 
CREATE TABLE `Audit_Log` (
	`log_id` BIGINT AUTO_INCREMENT,
    `actor_user_id` BIGINT,
    `action` ENUM('CREATE','UPDATE','DELETE','APPROVE','REJECT',
				'PUBLISH','CANCEL','ASSIGN','SUBMIT',
                'REVISE','VOTE','DECIDE') NOT NULL,
	`entity_type` VARCHAR(50) NOT NULL,
    `entity_id` BIGINT NOT NULL,
    `before_value` JSON,
    `after_value` JSON,
    `ip_address` VARCHAR(45),
    `user_agent` VARCHAR(500),
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (`log_id`),
    FOREIGN KEY (`actor_user_id`) REFERENCES `User`(`user_id`),
    INDEX `idx_audit_entity` (`entity_type`, `entity_id`),
    INDEX `idx_audit_actor` (`actor_user_id`),
    INDEX `idx_audit_created` (`created_at`)
);

-- System_Config 
CREATE TABLE `System_Config` (
	`config_key` VARCHAR(100),
    `config_value` TEXT NOT NULL,
    `description` VARCHAR(500),
    `updated_by_user_id` BIGINT,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    PRIMARY KEY (`config_key`),
    FOREIGN KEY (`updated_by_user_id`) REFERENCES `User`(`user_id`)
);






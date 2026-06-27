-- AlterTable
ALTER TABLE `manuscripts` MODIFY `file_url` LONGTEXT NOT NULL;

-- AlterTable
ALTER TABLE `page_versions` MODIFY `image_url` LONGTEXT NOT NULL;

-- CreateTable
CREATE TABLE `board_votes` (
    `vote_id` INTEGER NOT NULL AUTO_INCREMENT,
    `proposal_id` INTEGER NOT NULL,
    `board_user_id` INTEGER NOT NULL,
    `art_quality` DECIMAL(4, 1) NOT NULL,
    `story_clarity` DECIMAL(4, 1) NOT NULL,
    `market_potential` DECIMAL(4, 1) NOT NULL,
    `final_score` DECIMAL(4, 1) NOT NULL,
    `comment` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'REVIEWED',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `board_votes_proposal_id_board_user_id_key`(`proposal_id`, `board_user_id`),
    PRIMARY KEY (`vote_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `board_votes` ADD CONSTRAINT `board_votes_proposal_id_fkey` FOREIGN KEY (`proposal_id`) REFERENCES `series_proposals`(`proposal_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `board_votes` ADD CONSTRAINT `board_votes_board_user_id_fkey` FOREIGN KEY (`board_user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

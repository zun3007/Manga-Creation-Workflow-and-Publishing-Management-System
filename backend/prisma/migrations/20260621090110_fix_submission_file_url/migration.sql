/*
  Warnings:

  - You are about to alter the column `status` on the `board_votes` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(22))`.

*/
-- AlterTable
ALTER TABLE `board_votes` MODIFY `status` ENUM('REVIEWED', 'PENDING', 'REVISED') NOT NULL DEFAULT 'REVIEWED';

-- AlterTable
ALTER TABLE `submissions` MODIFY `file_url` LONGTEXT NOT NULL;

-- CreateIndex
CREATE INDEX `board_votes_proposal_id_idx` ON `board_votes`(`proposal_id`);

-- RenameIndex
ALTER TABLE `board_votes` RENAME INDEX `board_votes_board_user_id_fkey` TO `board_votes_board_user_id_idx`;

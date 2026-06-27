/*
  Warnings:

  - A unique constraint covering the columns `[google_subject]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `users` ADD COLUMN `email_verified_at` DATETIME(3) NULL,
    ADD COLUMN `google_subject` VARCHAR(255) NULL,
    ADD COLUMN `last_login_at` DATETIME(3) NULL,
    ADD COLUMN `must_change_password` BOOLEAN NOT NULL DEFAULT false,
    MODIFY `password_hash` VARCHAR(255) NULL;

-- CreateTable
CREATE TABLE `otp_codes` (
    `otp_id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(255) NOT NULL,
    `code_hash` VARCHAR(255) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `used_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `otp_codes_email_idx`(`email`),
    PRIMARY KEY (`otp_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `users_google_subject_key` ON `users`(`google_subject`);

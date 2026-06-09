-- ───────────────────────────────────────────────────────────────────────────
-- Email OTP two-factor authentication
-- Runs on a fresh `pnpm db:up` (mounted into /docker-entrypoint-initdb.d).
-- The backend ALSO runs `CREATE TABLE IF NOT EXISTS` on boot (OtpService.onModuleInit)
-- so existing dev DB volumes pick up the table without a full re-init.
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `Email_Otp` (
  `otp_id`      BIGINT       NOT NULL AUTO_INCREMENT,
  `user_id`     BIGINT       NOT NULL,
  `code_hash`   VARCHAR(255) NOT NULL,                 -- bcrypt hash of the 6-digit code
  `purpose`     VARCHAR(32)  NOT NULL DEFAULT 'login',
  `attempts`    INT          NOT NULL DEFAULT 0,        -- wrong-guess counter (lock at 5)
  `expires_at`  DATETIME     NOT NULL,
  `consumed_at` DATETIME     NULL,                      -- set when used or invalidated
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`otp_id`),
  INDEX `idx_email_otp_user` (`user_id`),
  INDEX `idx_email_otp_live` (`user_id`, `consumed_at`, `expires_at`),
  CONSTRAINT `fk_email_otp_user` FOREIGN KEY (`user_id`)
    REFERENCES `User` (`user_id`) ON DELETE CASCADE
);

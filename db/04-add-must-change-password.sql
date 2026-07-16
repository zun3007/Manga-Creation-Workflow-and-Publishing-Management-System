-- F06: Force Admin-created LOCAL accounts to change their initial password.
--
-- Existing accounts remain unaffected because the new column defaults to FALSE.
-- Admin-created accounts will explicitly set this value to TRUE.

ALTER TABLE `User`
  ADD COLUMN `must_change_password` BOOLEAN NOT NULL DEFAULT FALSE
  AFTER `is_activated`;

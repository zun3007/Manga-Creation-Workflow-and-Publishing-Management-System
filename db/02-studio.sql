CREATE TABLE IF NOT EXISTS `Studio_Document` (
  `page_id` INT NOT NULL,
  `manifest_json` JSON NOT NULL,
  `updated_by_user_id` INT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`page_id`),
  CONSTRAINT `fk_studiodoc_page` FOREIGN KEY (`page_id`) REFERENCES `Page`(`page_id`) ON DELETE CASCADE
);

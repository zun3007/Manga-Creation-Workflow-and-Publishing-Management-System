USE `manga_creation_workflow_and_publishing_management_system`;

ALTER TABLE `Chapter`
  MODIFY COLUMN `chapter_status`
    ENUM(
      'DRAFT',
      'IN_PROGRESS',
      'READY_FOR_EDITOR_REVIEW',
      'EDITOR_APPROVED',
      'BOARD_APPROVED',
      'PUBLISHED'
    ) NOT NULL DEFAULT 'DRAFT';

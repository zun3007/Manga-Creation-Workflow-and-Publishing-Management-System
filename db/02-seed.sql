-- ============================================================================
-- Demo seed data — Inkframe manga workflow demo
-- Password for dungminer69@gmail.com is set by the API on boot (bcrypt of Dung123456@).
-- ============================================================================
USE `manga_creation_workflow_and_publishing_management_system`;

SET NAMES utf8mb4;            -- interpret this UTF-8 file correctly (avoid mojibake)
SET FOREIGN_KEY_CHECKS = 0;

-- ===== Users =====
INSERT INTO `User` (user_id, email, password_hash, full_name, avatar_url, role, auth_provider, google_id, is_activated) VALUES
(1, 'dungminer69@gmail.com', NULL, 'Nguyễn Tiến Dũng', NULL, 'MANGAKA',     'LOCAL', NULL, 1),
(2, 'mai.assistant@inkframe.studio',     NULL, 'Mai Nguyễn',     NULL, 'ASSISTANT',       'LOCAL', NULL, 1),
(3, 'kenji.assistant@inkframe.studio',   NULL, 'Kenji Sato',     NULL, 'ASSISTANT',       'LOCAL', NULL, 1),
(4, 'lan.assistant@inkframe.studio',     NULL, 'Lan Trần',       NULL, 'ASSISTANT',       'LOCAL', NULL, 1),
(5, 'hiroshi.editor@inkframe.studio',    NULL, 'Hiroshi Tanaka', NULL, 'TANTOU_EDITOR',   'LOCAL', NULL, 1),
(6, 'yamamoto.board@inkframe.studio',    NULL, 'Yuki Yamamoto',  NULL, 'EDITORIAL_BOARD', 'LOCAL', NULL, 1),
(7, 'admin@inkframe.studio',             NULL, 'System Admin',   NULL, 'ADMIN',           'LOCAL', NULL, 1);

-- ===== Profiles =====
INSERT INTO `Mangaka_Profile` (user_id, pen_name, biography, years_experrence, studio_name, social_link) VALUES
(1, 'Kurogane', 'Tác giả của Crimson Inkfall. Mê khung tranh động và mực đen tuyền.', 6, 'Inkframe Studio', 'https://x.com/kurogane');

INSERT INTO `Assistant_Profile` (user_id, salary_rate, skill_set, total_earnings) VALUES
(2, 18.00, 'background, shading',        540.00),
(3, 22.00, 'character, effect',          760.00),
(4, 16.00, 'dialogue_bubble, background',380.00);

INSERT INTO `Tantou_Editor_Profile` (user_id, department_name, specialization, years_experience, managed_series_count) VALUES
(5, 'Weekly Shonen Desk', 'Shonen', 9, 3);

INSERT INTO `Editorial_Board_Profile` (user_id, position, seniority_level, voting_power, joined_at) VALUES
(6, 'Senior Editor', 4, 3, '2022-01-10 09:00:00');

-- ===== Genres =====
INSERT INTO `Genre` (genre_id, genre_name) VALUES
(1,'Action'),(2,'Fantasy'),(3,'Romance'),(4,'Shonen'),(5,'Mystery'),(6,'Slice of Life');

-- ===== Series proposals (all approved) =====
INSERT INTO `Series_Proposal` (proposal_id, mangaka_user_id, title, synopsis, proposal_status, proposed_frequency, review_due_date, submitted_at) VALUES
(1,1,'Crimson Inkfall','Một kiếm khách trẻ truy tìm thanh kiếm mực huyền thoại.','APPROVED','WEEKLY','2026-02-10','2026-02-01 10:00:00'),
(2,1,'Paper Lanterns','Slice-of-life về một tiệm đèn lồng giấy ở Kyoto.','APPROVED','MONTHLY','2026-03-05','2026-02-25 14:00:00'),
(3,1,'The Tenth Panel','Bí ẩn quanh một mangaka mất tích và khung tranh thứ mười.','APPROVED','WEEKLY','2026-03-20','2026-03-10 09:30:00');

-- ===== Series =====
INSERT INTO `Series` (series_id, proposal_id, mangaka_user_id, title, publication_frequency, series_status) VALUES
(1,1,1,'Crimson Inkfall','WEEKLY','ACTIVE'),
(2,2,1,'Paper Lanterns','MONTHLY','ACTIVE'),
(3,3,1,'The Tenth Panel','WEEKLY','AT_RISK');

INSERT INTO `Proposal_Genre` (proposal_id, genre_id) VALUES (1,1),(1,4),(2,6),(2,3),(3,5),(3,1);
INSERT INTO `Series_Genre`   (series_id,  genre_id) VALUES (1,1),(1,4),(2,6),(2,3),(3,5),(3,1);

INSERT INTO `Series_Tantou_Editor` (series_id, editor_user_id, assigned_at) VALUES
(1,5,'2026-02-12 09:00:00'),(2,5,'2026-03-06 09:00:00'),(3,5,'2026-03-22 09:00:00');

-- ===== Task price rules =====
INSERT INTO `Task_Price_Rule` (rule_id, rule_name, region_type, base_price, is_active, effective_from, created_by_user_id) VALUES
(1,'Panel base','PANEL',25.00,1,'2026-01-01',7),
(2,'Background base','BACKGROUND',20.00,1,'2026-01-01',7),
(3,'Character base','CHARACTER',30.00,1,'2026-01-01',7),
(4,'Dialogue bubble base','DIALOGUE_BUBBLE',10.00,1,'2026-01-01',7),
(5,'Effect base','EFFECT',15.00,1,'2026-01-01',7);

-- ===== Sample manuscript upload config =====
INSERT INTO `System_Config` (config_key, config_value, description, updated_by_user_id) VALUES
('sample_manuscript_allowed_extensions','.pdf,.png,.jpg,.jpeg,.webp','Allowed file extensions for proposal sample manuscripts',7),
('sample_manuscript_allowed_mime_types','application/pdf,image/png,image/jpeg,image/webp','Allowed MIME types for proposal sample manuscripts',7),
('sample_manuscript_max_mb','25','Maximum sample manuscript upload size in MB',7)
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), description = VALUES(description);

-- ===== Chapters =====
INSERT INTO `Chapter` (chapter_id, series_id, chapter_number, chapter_title, deadline, chapter_status, is_locked) VALUES
(1,1,1,'The Black Blade','2026-03-01 23:59:00','PUBLISHED',1),
(2,1,2,'Ashes of Dawn', '2026-04-01 23:59:00','PUBLISHED',1),
(3,1,3,'The Inkfall',   '2026-05-30 23:59:00','IN_PROGRESS',0),
(4,1,4,'Crimson Vow',   '2026-06-13 23:59:00','DRAFT',0),
(5,2,1,'Lantern Light', '2026-04-15 23:59:00','PUBLISHED',1),
(6,2,2,'Festival Night','2026-06-05 23:59:00','IN_PROGRESS',0),
(7,3,1,'The Vanishing', '2026-04-10 23:59:00','PUBLISHED',1),
(8,3,2,'Panel Ten',     '2026-05-29 23:59:00','READY_FOR_EDITOR_REVIEW',0);

-- ===== Pages (for in-progress chapters) =====
INSERT INTO `Page` (page_id, chapter_id, page_number, current_version, page_status) VALUES
(1,3,1,1,'COMPLETED'),(2,3,2,1,'REVIEWING'),(3,3,3,1,'IN_PROGRESS'),(4,3,4,1,'ASSIGNED'),(5,3,5,1,'RAW'),
(6,6,1,1,'IN_PROGRESS'),(7,6,2,1,'ASSIGNED'),
(8,8,1,1,'COMPLETED'),(9,8,2,1,'COMPLETED');

INSERT INTO `Page_Version` (page_version_id, page_id, version_number, image_url, uploaded_by_user_id, upload_note) VALUES
(1,1,1,'/pages/s1c3p1.png',1,'rough'),
(2,2,1,'/pages/s1c3p2.png',1,'rough'),
(3,3,1,'/pages/s1c3p3.png',1,'rough'),
(4,6,1,'/pages/s2c6p1.png',1,'rough');

INSERT INTO `Region` (region_id, page_id, page_version_id, region_type, x_coordinate, y_coordinate, width, height, `z-index`, ai_suggested) VALUES
(1,3,3,'BACKGROUND',0.0000,0.0000,1.0000,0.5000,0,1),
(2,3,3,'CHARACTER', 0.2000,0.3000,0.4000,0.6000,1,0),
(3,3,3,'EFFECT',    0.5000,0.1000,0.3000,0.3000,2,0),
(4,6,4,'BACKGROUND',0.0000,0.0000,1.0000,1.0000,0,0);

-- ===== Tasks =====
INSERT INTO `Task` (task_id, region_id, page_id, assignor_user_id, assignee_user_id, task_description, instruction, deadline, task_status, payment_amount, task_price_rule_id) VALUES
(1,1,3,1,2,'Vẽ nền dốc núi tuyết','Dùng screentone xám 30%','2026-05-29 18:00:00','APPROVED',20.00,2),
(2,2,3,1,3,'Tô nhân vật chính','Giữ nét mực dày ở viền','2026-05-29 18:00:00','SUBMITTED',30.00,3),
(3,3,3,1,3,'Hiệu ứng inkfall','Speed lines hướng tâm','2026-05-30 18:00:00','IN_PROGRESS',15.00,5),
(4,4,6,1,4,'Nền lễ hội đèn lồng','Bokeh đèn lồng ấm','2026-06-04 18:00:00','REVISION_REQUIRED',20.00,2),
(5,NULL,4,1,2,'Phác khung trang 4','Chia 5 panel động','2026-06-10 18:00:00','ASSIGNED',25.00,1);

-- ===== Submissions =====
INSERT INTO `Submission` (submission_id, task_id, page_id, assistant_user_id, version_number, file_url, version_note, submission_status, feedback, submitted_at, reviewed_by_user_id, reviewed_at) VALUES
(1,1,3,2,1,'/sub/t1v1.png','nền tuyết v1','APPROVED','Tốt, duyệt!','2026-05-26 10:00:00',1,'2026-05-26 15:00:00'),
(2,2,3,3,1,'/sub/t2v1.png','nhân vật v1','UNDER_REVIEW',NULL,'2026-05-27 09:00:00',NULL,NULL),
(3,4,6,4,1,'/sub/t4v1.png','nền lồng đèn v1','REVISION_REQUIRED','Đèn lồng quá chói, giảm sáng','2026-05-25 11:00:00',1,'2026-05-25 16:00:00');

-- ===== Publication schedule =====
INSERT INTO `Publication_Schedule` (schedule_id, chapter_id, release_date, publish_status, scheduled_by_user_id, published_at) VALUES
(1,1,'2026-03-02 12:00:00','PUBLISHED',6,'2026-03-02 12:00:00'),
(2,8,'2026-06-01 12:00:00','SCHEDULED',6,NULL);

-- ===== Voting / ranking =====
INSERT INTO `Vote_Period` (vote_period_id, series_id, ranking_period_type, period_start_date, period_end_date, status) VALUES
(1,1,'WEEKLY','2026-05-18','2026-05-24','CLOSED'),
(2,2,'MONTHLY','2026-04-01','2026-04-30','CLOSED'),
(3,3,'WEEKLY','2026-05-18','2026-05-24','CLOSED');

INSERT INTO `Vote` (vote_id, vote_period_id, board_user_id, score, comment) VALUES
(1,1,6,92.50,'Nét vẽ đỉnh'),
(2,2,6,80.00,'Ổn định'),
(3,3,6,55.00,'Nhịp truyện hơi chậm');

INSERT INTO `Ranking` (ranking_id, series_id, vote_period_id, rank_position, total_score, risk_level) VALUES
(1,1,1,1,92.50,'LOW'),
(2,2,2,3,80.00,'MEDIUM'),
(3,3,3,8,55.00,'HIGH');

-- ===== Notifications (for the mangaka) =====
INSERT INTO `Notification` (notification_id, recipient_user_id, notification_type, title, content, related_entity_type, related_entity_id, is_read) VALUES
(1,1,'RISK_ALERT','Series "The Tenth Panel" đang ở mức rủi ro CAO','Xếp hạng tuần này #8, điểm 55. Cân nhắc cải thiện nhịp truyện.','Series',3,0),
(2,1,'SUBMISSION','Bài nộp mới từ Kenji Sato','Task "Tô nhân vật chính" vừa được nộp — chờ bạn duyệt.','Task',2,0),
(3,1,'DEADLINE','Deadline Chapter 3 "The Inkfall" sắp tới','Còn 2 ngày — hạn 2026-05-30.','Chapter',3,0),
(4,1,'REVIEW','Editor đã duyệt Chapter "Panel Ten"','Hiroshi Tanaka chuyển sang sẵn sàng xuất bản.','Chapter',8,1),
(5,1,'REVISION','Bạn đã yêu cầu chỉnh sửa','Task "Nền lễ hội đèn lồng" cần chỉnh theo góp ý.','Task',4,1);

-- ===== Annotations =====
INSERT INTO `Annotation` (annotation_id, target_type, target_id, created_by_user_id, annotation_category, context, x_coordinate, y_coordinate, is_resolved) VALUES
(1,'SUBMISSION',3,1,'VISUAL_ISSUE','Đèn lồng quá chói ở góc phải',0.8000,0.2000,0),
(2,'PAGE',2,5,'CONTENT_ISSUE','Khung này thiếu thoại dẫn',0.5000,0.5000,0);

SET FOREIGN_KEY_CHECKS = 1;

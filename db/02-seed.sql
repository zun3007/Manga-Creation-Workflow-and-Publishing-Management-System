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

-- ===== Series proposals =====
INSERT INTO `Series_Proposal` (proposal_id, mangaka_user_id, title, synopsis, proposal_status, proposed_frequency, review_due_date, submitted_at) VALUES
(1,1,'Crimson Inkfall','Một kiếm khách trẻ truy tìm thanh kiếm mực huyền thoại.','APPROVED','WEEKLY','2026-02-10','2026-02-01 10:00:00'),
(2,1,'Paper Lanterns','Slice-of-life về một tiệm đèn lồng giấy ở Kyoto.','APPROVED','MONTHLY','2026-03-05','2026-02-25 14:00:00'),
(3,1,'The Tenth Panel','Bí ẩn quanh một mangaka mất tích và khung tranh thứ mười.','APPROVED','WEEKLY','2026-03-20','2026-03-10 09:30:00'),
(4,1,'Neon Monsoon','Một nữ tài xế giao hàng băng qua thành phố ngập nước, nơi ký ức của cư dân hóa thành những biển quảng cáo biết nói.','DRAFT','MONTHLY',NULL,NULL),
(5,1,'Clockwork Bento','Đầu bếp học việc phát hiện mỗi hộp cơm mình làm có thể tua lại đúng mười phút trong cuộc đời người ăn.','SUBMITTED','WEEKLY','2026-07-28','2026-07-20 08:45:00'),
(6,1,'Whispers Beneath the Tatami','Gia đình chuyển vào một lữ quán cổ và lần theo những lời thì thầm dưới chiếu tatami để giải một vụ mất tích trăm năm.','UNDER_REVIEW','MONTHLY','2026-07-25','2026-07-12 13:20:00'),
(7,1,'Turbo Tanuki Club','Nhóm tanuki mê đua xe tự chế tìm cách bảo vệ khu rừng khỏi dự án đường cao tốc bằng một giải đấu hỗn loạn.','REJECTED','WEEKLY','2026-06-18','2026-06-08 16:10:00'),
(8,1,'Asterism Academy','Những học sinh mang năng lực của các chòm sao phải hợp tác khi bầu trời đêm bắt đầu mất dần từng vì tinh tú.','APPROVED','MONTHLY','2026-05-14','2026-05-01 09:15:00'),
(9,1,'Last Train to Yomi','Chuyến tàu cuối ngày bí mật chở linh hồn; một nhân viên soát vé mới phải đưa từng hành khách tới đúng thế giới bên kia.','APPROVED','WEEKLY','2026-04-22','2026-04-11 18:30:00'),
(10,1,'The Garden of Borrowed Faces','Một nghệ nhân làm mặt nạ có thể mượn cảm xúc của khách hàng nhưng dần đánh mất khuôn mặt thật của chính mình.','APPROVED','MONTHLY','2026-03-30','2026-03-18 11:00:00'),
(11,1,'Quantum Ramen Run','Một đầu bếp đường phố giao những bát ramen xuyên qua các dòng thời gian để ngăn một tập đoàn xóa sổ hương vị cuối cùng của Tokyo.','APPROVED','WEEKLY','2026-06-06','2026-05-24 08:30:00'),
(12,1,'Moonlit Apothecary','Dược sư trẻ chỉ mở tiệm khi trăng lên, chữa những căn bệnh sinh ra từ lời hứa bị lãng quên giữa con người và yêu quái.','APPROVED','MONTHLY','2026-05-20','2026-05-04 19:10:00'),
(13,1,'Silent Frequency','Một kỹ thuật viên radio bắt được chương trình phát sóng từ tương lai và phát hiện mỗi lời cảnh báo đều khiến hiện tại biến đổi nguy hiểm hơn.','APPROVED','WEEKLY','2026-04-16','2026-04-02 22:15:00'),
(14,1,'Tidal Archive','Thủ thư của thành phố chìm lặn xuống đại dương ký ức để cứu các cuốn sách sống trước khi thủy triều đen nuốt mất lịch sử.','APPROVED','MONTHLY','2026-03-12','2026-02-26 10:40:00');

-- ===== Series =====
INSERT INTO `Series` (series_id, proposal_id, mangaka_user_id, title, publication_frequency, series_status) VALUES
(1,1,1,'Crimson Inkfall','WEEKLY','ACTIVE'),
(2,2,1,'Paper Lanterns','MONTHLY','ACTIVE'),
(3,3,1,'The Tenth Panel','WEEKLY','AT_RISK'),
(4,8,1,'Asterism Academy','MONTHLY','HIATUS'),
(5,9,1,'Last Train to Yomi','WEEKLY','CANCELLED'),
(6,10,1,'The Garden of Borrowed Faces','MONTHLY','COMPLETED'),
(7,11,1,'Quantum Ramen Run','WEEKLY','ACTIVE'),
(8,12,1,'Moonlit Apothecary','MONTHLY','ACTIVE'),
(9,13,1,'Silent Frequency','WEEKLY','AT_RISK'),
(10,14,1,'Tidal Archive','MONTHLY','HIATUS');

INSERT INTO `Proposal_Genre` (proposal_id, genre_id) VALUES
(1,1),(1,4),(2,6),(2,3),(3,5),(3,1),
(4,2),(4,5),(5,6),(5,2),(6,5),(6,2),(7,1),(7,6),
(8,2),(8,4),(9,5),(9,2),(10,3),(10,5),
(11,1),(11,6),(11,4),(12,2),(12,3),(12,6),
(13,5),(13,1),(13,4),(14,2),(14,5);

INSERT INTO `Series_Genre` (series_id, genre_id) VALUES
(1,1),(1,4),(2,6),(2,3),(3,5),(3,1),
(4,2),(4,4),(5,5),(5,2),(6,3),(6,5),
(7,1),(7,6),(7,4),(8,2),(8,3),(8,6),
(9,5),(9,1),(9,4),(10,2),(10,5);

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
(8,3,2,'Panel Ten',     '2026-05-29 23:59:00','READY_FOR_EDITOR_REVIEW',0),

-- Additional chapters for the existing series, covering the remaining workflow states.
(9,1,5,'Echoes in Vermilion',          '2026-07-04 23:59:00','READY_FOR_EDITOR_REVIEW',0),
(10,1,6,'The Sword That Remembers',     '2026-07-11 23:59:00','EDITOR_APPROVED',0),
(11,2,3,'Rain over Gion',               '2026-07-15 23:59:00','BOARD_APPROVED',0),
(12,2,4,'A Letter without an Address',  NULL,                 'DRAFT',0),
(13,3,3,'Margins of Silence',           '2026-06-12 23:59:00','IN_PROGRESS',0),
(14,3,4,'The Erased Name',              '2026-06-19 23:59:00','EDITOR_APPROVED',0),

-- Asterism Academy (HIATUS): published history plus work paused at different stages.
(15,4,1,'The Falling Lyra',             '2026-01-31 23:59:00','PUBLISHED',1),
(16,4,2,'Orion Does Not Answer',        '2026-02-28 23:59:00','BOARD_APPROVED',0),
(17,4,3,'A Sky without Stars',          NULL,                 'DRAFT',0),

-- Last Train to Yomi (CANCELLED): retained production history after cancellation.
(18,5,1,'Platform Zero',                '2026-02-07 23:59:00','PUBLISHED',1),
(19,5,2,'The Passenger with No Shadow', '2026-02-14 23:59:00','IN_PROGRESS',0),
(20,5,3,'Terminus',                     NULL,                 'DRAFT',0),

-- The Garden of Borrowed Faces (COMPLETED): all chapters are immutable publications.
(21,6,1,'The Smile of a Stranger',      '2025-11-30 23:59:00','PUBLISHED',1),
(22,6,2,'Clay Tears',                   '2025-12-31 23:59:00','PUBLISHED',1),
(23,6,3,'My Own Face',                  '2026-01-31 23:59:00','PUBLISHED',1),

-- Quantum Ramen Run (ACTIVE): fast weekly production with completed and upcoming work.
(24,7,1,'Broth across Time',            '2026-06-14 23:59:00','PUBLISHED',1),
(25,7,2,'The Noodle Paradox',           '2026-07-26 23:59:00','IN_PROGRESS',0),
(26,7,3,'Delivery to Yesterday',        '2026-08-02 23:59:00','READY_FOR_EDITOR_REVIEW',0),
(27,7,4,'Last Order at Infinity',       '2026-08-09 23:59:00','DRAFT',0),

-- Moonlit Apothecary (ACTIVE): monthly chapters spread across editorial approval stages.
(28,8,1,'Medicine for a Broken Oath',   '2026-04-30 23:59:00','PUBLISHED',1),
(29,8,2,'The Fox Bride Fever',          '2026-07-31 23:59:00','EDITOR_APPROVED',0),
(30,8,3,'Prescription under Blue Moon', '2026-08-31 23:59:00','BOARD_APPROVED',0),
(31,8,4,'The Apothecary without a Name',NULL,                 'DRAFT',0),

-- Silent Frequency (AT_RISK): overdue production and chapters waiting for review.
(32,9,1,'Broadcast at 00:13',           '2026-05-03 23:59:00','PUBLISHED',1),
(33,9,2,'Static Knows Your Name',       '2026-07-18 23:59:00','IN_PROGRESS',0),
(34,9,3,'Tomorrow Calls Collect',       '2026-07-25 23:59:00','READY_FOR_EDITOR_REVIEW',0),
(35,9,4,'Dead Air',                     '2026-08-01 23:59:00','EDITOR_APPROVED',0),

-- Tidal Archive (HIATUS): historic publication plus paused unfinished material.
(36,10,1,'The Drowned Reading Room',    '2026-02-28 23:59:00','PUBLISHED',1),
(37,10,2,'Catalogue of Lost Summers',   '2026-03-31 23:59:00','BOARD_APPROVED',0),
(38,10,3,'Ink beneath the Current',     '2026-05-31 23:59:00','IN_PROGRESS',0),
(39,10,4,'When the Tide Forgets',       NULL,                 'DRAFT',0);

-- ===== Pages =====
INSERT INTO `Page` (page_id, chapter_id, page_number, current_version, page_status) VALUES
(1,3,1,1,'COMPLETED'),(2,3,2,1,'REVIEWING'),(3,3,3,1,'IN_PROGRESS'),(4,3,4,1,'ASSIGNED'),(5,3,5,1,'RAW'),
(6,6,1,1,'IN_PROGRESS'),(7,6,2,1,'ASSIGNED'),
(8,8,1,1,'COMPLETED'),(9,8,2,1,'COMPLETED'),
(10,1,1,1,'COMPLETED'),(11,2,1,1,'COMPLETED'),(12,4,1,1,'RAW'),
(13,5,1,1,'COMPLETED'),(14,7,1,1,'COMPLETED'),
(15,9,1,1,'REVIEWING'),(16,10,1,1,'COMPLETED'),
(17,11,1,1,'COMPLETED'),(18,12,1,1,'RAW'),
(19,13,1,1,'ASSIGNED'),(20,14,1,1,'REVIEWING'),
(21,15,1,1,'COMPLETED'),(22,16,1,1,'COMPLETED'),(23,17,1,1,'RAW'),
(24,18,1,1,'COMPLETED'),(25,19,1,1,'IN_PROGRESS'),(26,20,1,1,'RAW'),
(27,21,1,1,'COMPLETED'),(28,22,1,1,'COMPLETED'),(29,23,1,1,'COMPLETED'),
(30,13,2,1,'IN_PROGRESS'),(31,9,2,1,'IN_PROGRESS'),
(32,24,1,2,'COMPLETED'),(33,24,2,1,'COMPLETED'),
(34,25,1,1,'IN_PROGRESS'),(35,25,2,1,'RAW'),
(36,26,1,1,'COMPLETED'),(37,26,2,1,'COMPLETED'),
(38,27,1,1,'RAW'),(39,27,2,1,'RAW'),
(40,28,1,2,'COMPLETED'),(41,28,2,1,'COMPLETED'),
(42,29,1,1,'COMPLETED'),(43,29,2,1,'COMPLETED'),
(44,30,1,1,'COMPLETED'),(45,30,2,1,'COMPLETED'),
(46,31,1,1,'RAW'),(47,31,2,1,'RAW'),
(48,32,1,1,'COMPLETED'),(49,32,2,1,'COMPLETED'),
(50,33,1,2,'IN_PROGRESS'),(51,33,2,1,'REVIEWING'),
(52,34,1,1,'COMPLETED'),(53,34,2,1,'COMPLETED'),
(54,35,1,1,'COMPLETED'),(55,35,2,1,'COMPLETED'),
(56,36,1,1,'COMPLETED'),(57,36,2,1,'COMPLETED'),
(58,37,1,2,'COMPLETED'),(59,37,2,1,'COMPLETED'),
(60,38,1,1,'IN_PROGRESS'),(61,38,2,1,'RAW'),
(62,39,1,1,'RAW'),(63,39,2,1,'RAW');

INSERT INTO `Page_Version` (page_version_id, page_id, version_number, image_url, uploaded_by_user_id, upload_note) VALUES
(1,1,1,'/pages/s1c3p1.png',1,'rough'),
(2,2,1,'/pages/s1c3p2.png',1,'rough'),
(3,3,1,'/pages/s1c3p3.png',1,'rough'),
(4,6,1,'/pages/s2c6p1.png',1,'rough'),
(5,4,1,'/pages/s1c3p4.png',1,'Bản phác bố cục năm khung'),
(6,5,1,'/pages/s1c3p5.png',1,'Trang trắng chờ triển khai'),
(7,7,1,'/pages/s2c2p2.png',1,'Phác thảo cảnh lễ hội'),
(8,8,1,'/pages/s3c2p1.png',1,'Bản hoàn thiện trang 1'),
(9,9,1,'/pages/s3c2p2.png',1,'Bản hoàn thiện trang 2'),
(10,10,1,'/pages/s1c1p1.png',1,'Bản lưu trữ đã xuất bản'),
(11,11,1,'/pages/s1c2p1.png',1,'Bản lưu trữ đã xuất bản'),
(12,12,1,'/pages/s1c4p1.png',1,'Trang mở đầu chưa phân công'),
(13,13,1,'/pages/s2c1p1.png',1,'Bản lưu trữ đã xuất bản'),
(14,14,1,'/pages/s3c1p1.png',1,'Bản lưu trữ đã xuất bản'),
(15,15,1,'/pages/s1c5p1.png',1,'Bản nét đang chờ duyệt công việc trợ lý'),
(16,16,1,'/pages/s1c6p1.png',1,'Trang đã hoàn tất toàn bộ vùng việc'),
(17,17,1,'/pages/s2c3p1.png',1,'Trang đã sẵn sàng sau phê duyệt'),
(18,18,1,'/pages/s2c4p1.png',1,'Trang nháp chưa có deadline'),
(19,19,1,'/pages/s3c3p1.png',1,'Trang đã chia vùng và giao việc'),
(20,20,1,'/pages/s3c4p1.png',1,'Trang đang chờ mangaka duyệt bài nộp'),
(21,21,1,'/pages/s4c1p1.png',1,'Trang đã xuất bản trước khi tạm ngưng'),
(22,22,1,'/pages/s4c2p1.png',1,'Trang đã được hội đồng duyệt'),
(23,23,1,'/pages/s4c3p1.png',1,'Ý tưởng trang đang tạm hoãn'),
(24,24,1,'/pages/s5c1p1.png',1,'Trang đã xuất bản trước khi series bị hủy'),
(25,25,1,'/pages/s5c2p1.png',1,'Công việc dang dở được lưu lại'),
(26,26,1,'/pages/s5c3p1.png',1,'Trang chưa sản xuất khi series bị hủy'),
(27,27,1,'/pages/s6c1p1.png',1,'Bản xuất bản hoàn chỉnh'),
(28,28,1,'/pages/s6c2p1.png',1,'Bản xuất bản hoàn chỉnh'),
(29,29,1,'/pages/s6c3p1.png',1,'Trang kết thúc series'),
(30,30,1,'/pages/s3c3p2.png',1,'Trang nhân vật đang được trợ lý xử lý'),
(31,31,1,'/pages/s1c5p2.png',1,'Trang hiệu ứng đang chờ chỉnh sửa'),
(32,32,1,'/pages/s7c1p1-v1.png',1,'Bản nét đầu của cảnh mở màn'),
(33,32,2,'/pages/s7c1p1-v2.png',1,'Bản xuất bản đã sửa hiệu ứng thời gian'),
(34,33,1,'/pages/s7c1p2.png',1,'Trang giao ramen xuyên thời gian'),
(35,34,1,'/pages/s7c2p1.png',1,'Bản đang hoàn thiện phối cảnh nhà bếp'),
(36,35,1,'/pages/s7c2p2.png',1,'Trang thô chưa xử lý'),
(37,36,1,'/pages/s7c3p1.png',1,'Trang hoàn tất chờ editor'),
(38,37,1,'/pages/s7c3p2.png',1,'Trang cao trào hoàn tất chờ editor'),
(39,38,1,'/pages/s7c4p1.png',1,'Trang nháp cho chapter kế tiếp'),
(40,39,1,'/pages/s7c4p2.png',1,'Trang trắng chưa triển khai'),
(41,40,1,'/pages/s8c1p1-v1.png',1,'Bản đầu của tiệm thuốc dưới trăng'),
(42,40,2,'/pages/s8c1p1-v2.png',1,'Bản xuất bản cân chỉnh ánh trăng'),
(43,41,1,'/pages/s8c1p2.png',1,'Trang yêu quái nhận thuốc'),
(44,42,1,'/pages/s8c2p1.png',1,'Trang đã được editor phê duyệt'),
(45,43,1,'/pages/s8c2p2.png',1,'Cảnh cô dâu hồ ly hoàn chỉnh'),
(46,44,1,'/pages/s8c3p1.png',1,'Trang đã được hội đồng duyệt'),
(47,45,1,'/pages/s8c3p2.png',1,'Công thức dưới trăng xanh hoàn chỉnh'),
(48,46,1,'/pages/s8c4p1.png',1,'Ý tưởng trang chưa có deadline'),
(49,47,1,'/pages/s8c4p2.png',1,'Trang nháp chưa triển khai'),
(50,48,1,'/pages/s9c1p1.png',1,'Phòng phát thanh lúc nửa đêm'),
(51,49,1,'/pages/s9c1p2.png',1,'Trang phát sóng đầu tiên đã xuất bản'),
(52,50,1,'/pages/s9c2p1-v1.png',1,'Bản phác tín hiệu nhiễu'),
(53,50,2,'/pages/s9c2p1-v2.png',1,'Bản đang sửa sau khi thay đổi hiện tại'),
(54,51,1,'/pages/s9c2p2.png',1,'Trang đang trong giai đoạn review nội bộ'),
(55,52,1,'/pages/s9c3p1.png',1,'Trang hoàn tất chờ editor'),
(56,53,1,'/pages/s9c3p2.png',1,'Thông điệp từ tương lai đã hoàn tất'),
(57,54,1,'/pages/s9c4p1.png',1,'Trang editor đã phê duyệt'),
(58,55,1,'/pages/s9c4p2.png',1,'Cảnh mất tín hiệu hoàn chỉnh'),
(59,56,1,'/pages/s10c1p1.png',1,'Thư viện chìm đã xuất bản'),
(60,57,1,'/pages/s10c1p2.png',1,'Trang lưu trữ ký ức dưới biển'),
(61,58,1,'/pages/s10c2p1-v1.png',1,'Bản đầu của danh mục ký ức'),
(62,58,2,'/pages/s10c2p1-v2.png',1,'Bản hội đồng phê duyệt'),
(63,59,1,'/pages/s10c2p2.png',1,'Trang đã sẵn sàng lên lịch'),
(64,60,1,'/pages/s10c3p1.png',1,'Trang đang sản xuất khi series tạm ngưng'),
(65,61,1,'/pages/s10c3p2.png',1,'Trang thô bị tạm dừng'),
(66,62,1,'/pages/s10c4p1.png',1,'Ý tưởng thủy triều ký ức'),
(67,63,1,'/pages/s10c4p2.png',1,'Trang chưa có deadline');

INSERT INTO `Region` (region_id, page_id, page_version_id, region_type, x_coordinate, y_coordinate, width, height, `z-index`, ai_suggested) VALUES
(1,3,3,'BACKGROUND',0.0000,0.0000,1.0000,0.5000,0,1),
(2,3,3,'CHARACTER', 0.2000,0.3000,0.4000,0.6000,1,0),
(3,3,3,'EFFECT',    0.5000,0.1000,0.3000,0.3000,2,0),
(4,6,4,'BACKGROUND',0.0000,0.0000,1.0000,1.0000,0,0),
(5,12,12,'PANEL',0.0500,0.0500,0.9000,0.4000,0,1),
(6,19,19,'BACKGROUND',0.0000,0.0000,1.0000,0.5500,0,1),
(7,30,30,'CHARACTER',0.1800,0.1800,0.4200,0.7200,1,0),
(8,15,15,'EFFECT',0.4500,0.0800,0.4800,0.3500,2,1),
(9,31,31,'DIALOGUE_BUBBLE',0.5800,0.1200,0.3000,0.2200,3,0),
(10,16,16,'BACKGROUND',0.0000,0.0000,1.0000,1.0000,0,0),
(11,20,20,'PANEL',0.0600,0.5200,0.8800,0.4200,0,1);

-- ===== Tasks =====
INSERT INTO `Task` (task_id, region_id, page_id, assignor_user_id, assignee_user_id, task_description, instruction, deadline, task_status, payment_amount, task_price_rule_id) VALUES
(1,1,3,1,2,'Vẽ nền dốc núi tuyết','Dùng screentone xám 30%','2026-05-29 18:00:00','APPROVED',20.00,2),
(2,2,3,1,3,'Tô nhân vật chính','Giữ nét mực dày ở viền','2026-05-29 18:00:00','SUBMITTED',30.00,3),
(3,3,3,1,3,'Hiệu ứng inkfall','Speed lines hướng tâm','2026-05-30 18:00:00','IN_PROGRESS',15.00,5),
(4,4,6,1,4,'Nền lễ hội đèn lồng','Bokeh đèn lồng ấm','2026-06-04 18:00:00','REVISION_REQUIRED',20.00,2),
(5,NULL,4,1,2,'Phác khung trang 4','Chia 5 panel động','2026-06-10 18:00:00','ASSIGNED',25.00,1),
(6,6,19,1,2,'Vẽ nền hành lang ký ức','Chưa bắt đầu; dùng phối cảnh một điểm tụ và tông xám lạnh','2026-07-26 18:00:00','ASSIGNED',20.00,2),
(7,7,30,1,3,'Hoàn thiện nhân vật người đưa thư','Đang thực hiện; giữ tỷ lệ cơ thể theo bản model sheet','2026-07-24 18:00:00','IN_PROGRESS',30.00,3),
(8,8,15,1,4,'Vẽ hiệu ứng mực đỏ lan','Đã nộp; hiệu ứng cần rõ hướng chuyển động từ trái sang phải','2026-07-21 18:00:00','SUBMITTED',15.00,5),
(9,9,31,1,2,'Chỉnh bong bóng thoại hồi tưởng','Đã làm lần một nhưng cần sửa khoảng cách chữ và viền bong bóng','2026-07-23 18:00:00','REVISION_REQUIRED',10.00,4),
(10,10,16,1,3,'Hoàn thiện nền thư viện kiếm','Đã hoàn thành và được mangaka phê duyệt','2026-07-18 18:00:00','APPROVED',20.00,2),
(11,11,20,1,4,'Đi nét khung cao trào','Đã nộp, đang chờ mangaka đánh giá','2026-07-22 18:00:00','SUBMITTED',25.00,1);

-- ===== Submissions =====
INSERT INTO `Submission` (submission_id, task_id, page_id, assistant_user_id, version_number, file_url, version_note, submission_status, feedback, submitted_at, reviewed_by_user_id, reviewed_at) VALUES
(1,1,3,2,1,'/sub/t1v1.png','nền tuyết v1','APPROVED','Tốt, duyệt!','2026-05-26 10:00:00',1,'2026-05-26 15:00:00'),
(2,2,3,3,1,'/sub/t2v1.png','nhân vật v1','UNDER_REVIEW',NULL,'2026-05-27 09:00:00',NULL,NULL),
(3,4,6,4,1,'/sub/t4v1.png','nền lồng đèn v1','REVISION_REQUIRED','Đèn lồng quá chói, giảm sáng','2026-05-25 11:00:00',1,'2026-05-25 16:00:00'),
(4,8,15,4,1,'/sub/t8v1.png','Hiệu ứng mực đỏ bản đầu','PENDING',NULL,'2026-07-21 16:20:00',NULL,NULL),
(5,9,31,2,1,'/sub/t9v1.png','Bong bóng thoại bản đầu','REVISION_REQUIRED','Giảm cỡ chữ, tăng khoảng trắng và làm mềm phần đuôi bong bóng.','2026-07-20 09:40:00',1,'2026-07-20 14:15:00'),
(6,10,16,3,1,'/sub/t10v1.png','Nền thư viện kiếm hoàn chỉnh','APPROVED','Phối cảnh tốt, sắc độ phù hợp và không che nhân vật.','2026-07-17 15:30:00',1,'2026-07-17 19:00:00'),
(7,11,20,4,1,'/sub/t11v1.png','Khung cao trào đã đi nét','UNDER_REVIEW',NULL,'2026-07-22 10:10:00',NULL,NULL);

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

import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

@Injectable()
export class DashboardService {
  constructor(private readonly db: DbService) {}

  async summary(userId: number) {
    const row = await this.db.queryOne(
      `SELECT
        (SELECT COUNT(*) FROM \`Series\` WHERE mangaka_user_id = ?) AS totalSeries,
        (SELECT COUNT(*) FROM \`Series\` WHERE mangaka_user_id = ? AND series_status = 'ACTIVE') AS activeSeries,
        (SELECT COUNT(*) FROM \`Series\` WHERE mangaka_user_id = ? AND series_status = 'AT_RISK') AS atRiskSeries,
        (SELECT COUNT(*) FROM \`Chapter\` c JOIN \`Series\` s ON c.series_id = s.series_id
           WHERE s.mangaka_user_id = ? AND c.chapter_status = 'IN_PROGRESS') AS chaptersInProgress,
        (SELECT COUNT(*) FROM \`Task\` WHERE assignor_user_id = ? AND task_status <> 'APPROVED') AS openTasks,
        (SELECT COUNT(*) FROM \`Submission\` sub JOIN \`Task\` t ON sub.task_id = t.task_id
           WHERE t.assignor_user_id = ? AND sub.submission_status IN ('PENDING','UNDER_REVIEW')) AS pendingReview,
        (SELECT COUNT(*) FROM \`Notification\` WHERE recipient_user_id = ? AND is_read = 0) AS unreadNotifications`,
      [userId, userId, userId, userId, userId, userId, userId],
    );
    return row;
  }

  series(userId: number) {
    return this.db.query(
      `SELECT s.series_id AS id, s.title, s.series_status AS status, s.publication_frequency AS frequency,
              r.rank_position AS rankPosition, r.total_score AS score, r.risk_level AS riskLevel,
              (SELECT COUNT(*) FROM \`Chapter\` c WHERE c.series_id = s.series_id) AS chapters,
              (SELECT COUNT(*) FROM \`Chapter\` c WHERE c.series_id = s.series_id AND c.chapter_status = 'PUBLISHED') AS published
       FROM \`Series\` s
       LEFT JOIN \`Ranking\` r
         ON r.series_id = s.series_id
        AND r.vote_period_id = (
              SELECT vp.vote_period_id FROM \`Vote_Period\` vp
              WHERE vp.series_id = s.series_id
              ORDER BY vp.period_end_date DESC LIMIT 1)
       WHERE s.mangaka_user_id = ?
       ORDER BY (r.rank_position IS NULL), r.rank_position`,
      [userId],
    );
  }

  tasks(userId: number) {
    return this.db.query(
      `SELECT t.task_id AS id, t.task_description AS description, t.task_status AS status,
              t.deadline, t.payment_amount AS payment,
              u.full_name AS assignee, u.avatar_url AS assigneeAvatar,
              c.chapter_title AS chapter, s.title AS series, p.page_number AS page
       FROM \`Task\` t
       JOIN \`User\` u ON u.user_id = t.assignee_user_id
       LEFT JOIN \`Page\` p ON p.page_id = t.page_id
       LEFT JOIN \`Chapter\` c ON c.chapter_id = p.chapter_id
       LEFT JOIN \`Series\` s ON s.series_id = c.series_id
       WHERE t.assignor_user_id = ?
       ORDER BY t.deadline ASC
       LIMIT 20`,
      [userId],
    );
  }

  submissions(userId: number) {
    return this.db.query(
      `SELECT sub.submission_id AS id, sub.submission_status AS status, sub.version_note AS note,
              sub.submitted_at AS submittedAt,
              t.task_description AS task, u.full_name AS assistant, u.avatar_url AS assistantAvatar
       FROM \`Submission\` sub
       JOIN \`Task\` t ON t.task_id = sub.task_id
       JOIN \`User\` u ON u.user_id = sub.assistant_user_id
       WHERE t.assignor_user_id = ? AND sub.submission_status IN ('PENDING','UNDER_REVIEW')
       ORDER BY sub.submitted_at ASC`,
      [userId],
    );
  }

  notifications(userId: number) {
    return this.db.query(
      `SELECT notification_id AS id, notification_type AS type, title, content,
              is_read AS isRead, created_at AS createdAt
       FROM \`Notification\`
       WHERE recipient_user_id = ?
       ORDER BY is_read ASC, created_at DESC
       LIMIT 20`,
      [userId],
    );
  }
}

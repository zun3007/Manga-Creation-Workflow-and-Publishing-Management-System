import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

@Injectable()
export class EarningsService {
  constructor(private readonly db: DbService) {}

  async mine(userId: number) {
    const profile = await this.db.queryOne<{ total: number }>(
      `SELECT COALESCE(total_earnings, 0) AS total FROM \`Assistant_Profile\` WHERE user_id = ?`,
      [userId],
    );

    const tasks = await this.db.query(
      `SELECT t.task_id AS id,
              t.task_description AS description,
              t.payment_amount AS amount,
              s.title AS series,
              c.chapter_title AS chapter,
              p.page_number AS page,
              r.region_type AS regionType,
              (SELECT MAX(sub.reviewed_at) FROM \`Submission\` sub WHERE sub.task_id = t.task_id AND sub.submission_status = 'APPROVED') AS earnedAt,
              EXISTS(SELECT 1 FROM \`Earning_Dispute\` d WHERE d.task_id = t.task_id AND d.assistant_user_id = t.assignee_user_id) AS hasDispute
       FROM \`Task\` t
       JOIN \`Page\` p ON p.page_id = t.page_id
       JOIN \`Chapter\` c ON c.chapter_id = p.chapter_id
       JOIN \`Series\` s ON s.series_id = c.series_id
       JOIN \`Region\` r ON r.region_id = t.region_id
       WHERE t.assignee_user_id = ? AND t.task_status = 'APPROVED'
       ORDER BY earnedAt DESC`,
      [userId],
    );

    return {
      total: Number(profile?.total ?? 0),
      tasks,
    };
  }
}

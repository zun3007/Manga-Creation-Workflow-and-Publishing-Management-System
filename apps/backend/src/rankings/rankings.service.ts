import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, RiskLevel } from '@manga/shared';
import { CreateVotePeriodDto } from './dto/create-vote-period.dto';
import { CreateVoteDto } from './dto/create-vote.dto';

@Injectable()
export class RankingsService {
  constructor(
    private readonly db: DbService,
    private readonly notifications: NotificationsService,
  ) {}

  async openPeriod(dto: CreateVotePeriodDto) {
    const periodId = await this.db.insert(
      `INSERT INTO \`Vote_Period\` (series_id, ranking_period_type, period_start_date, period_end_date, status)
       VALUES (?, ?, ?, ?, 'OPEN')`,
      [dto.seriesId, dto.periodType, dto.startDate, dto.endDate],
    );

    return { id: periodId };
  }

  async openPeriods(boardUserId: number) {
    return this.db.query<{
      id: number;
      seriesId: number;
      series: string;
      periodType: 'WEEKLY' | 'MONTHLY';
      endDate: string;
      hasVoted: boolean;
    }>(
      `SELECT
        vp.vote_period_id AS id,
        vp.series_id AS seriesId,
        s.title AS series,
        vp.ranking_period_type AS periodType,
        vp.period_end_date AS endDate,
        EXISTS(SELECT 1 FROM \`Vote\` v WHERE v.vote_period_id=vp.vote_period_id AND v.board_user_id=?) AS hasVoted
       FROM \`Vote_Period\` vp
       JOIN \`Series\` s ON s.series_id=vp.series_id
       WHERE vp.status='OPEN'
       ORDER BY vp.period_end_date`,
      [boardUserId],
    );
  }

  async castVote(boardUserId: number, dto: CreateVoteDto) {
    // Verify period is OPEN
    const period = await this.db.queryOne<{
      vote_period_id: number;
      status: string;
    }>(
      `SELECT vote_period_id, status FROM \`Vote_Period\` WHERE vote_period_id = ?`,
      [dto.votePeriodId],
    );

    if (!period || period.status !== 'OPEN') {
      throw new BadRequestException('Kỳ bình chọn đã đóng hoặc không tồn tại');
    }

    // Upsert vote
    await this.db.query(
      `INSERT INTO \`Vote\` (vote_period_id, board_user_id, score, comment)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE score=VALUES(score), comment=VALUES(comment)`,
      [dto.votePeriodId, boardUserId, dto.score, dto.comment ?? null],
    );

    return { ok: true };
  }

  async closePeriod(periodId: number) {
    // Load period
    const period = await this.db.queryOne<{
      vote_period_id: number;
      series_id: number;
    }>(
      `SELECT vote_period_id, series_id FROM \`Vote_Period\` WHERE vote_period_id = ?`,
      [periodId],
    );

    if (!period) {
      throw new NotFoundException('Vote period not found');
    }

    // Close period
    await this.db.query(
      `UPDATE \`Vote_Period\` SET status='CLOSED' WHERE vote_period_id=?`,
      [periodId],
    );

    // Compute average score
    const agg = await this.db.queryOne<{
      avg: number | null;
      n: number;
    }>(
      `SELECT AVG(score) AS avg, COUNT(*) AS n FROM \`Vote\` WHERE vote_period_id=?`,
      [periodId],
    );

    const total = Number(agg?.avg ?? 0);

    // Determine risk level
    let risk: RiskLevel;
    if (total < 2.5) {
      risk = RiskLevel.HIGH;
    } else if (total < 3.5) {
      risk = RiskLevel.MEDIUM;
    } else {
      risk = RiskLevel.LOW;
    }

    // Compute rank position: count how many series have higher scores
    const rankCount = await this.db.queryOne<{
      c: number;
    }>(
      `SELECT COUNT(DISTINCT series_id) AS c FROM \`Ranking\` WHERE total_score > ?`,
      [total],
    );

    const rankPosition = 1 + (rankCount?.c ?? 0);

    // Upsert ranking
    await this.db.query(
      `INSERT INTO \`Ranking\` (series_id, vote_period_id, rank_position, total_score, risk_level)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE rank_position=VALUES(rank_position), total_score=VALUES(total_score), risk_level=VALUES(risk_level)`,
      [period.series_id, periodId, rankPosition, total, risk],
    );

    // If HIGH risk, update series status and notify mangaka and editors
    if (risk === RiskLevel.HIGH) {
      await this.db.query(
        `UPDATE \`Series\` SET series_status='AT_RISK' WHERE series_id=?`,
        [period.series_id],
      );

      // Get mangaka user ID
      const series = await this.db.queryOne<{
        mangaka_user_id: number;
      }>(`SELECT mangaka_user_id FROM \`Series\` WHERE series_id=?`, [
        period.series_id,
      ]);

      if (series) {
        await this.notifications.notify(
          series.mangaka_user_id,
          NotificationType.RISK_ALERT,
          'Series của bạn đang ở mức rủi ro cao',
          `Điểm trung bình ${total.toFixed(2)}`,
          'Series',
          period.series_id,
        );

        // Notify active editors
        const editors = await this.db.query<{ editor_user_id: number }>(
          `SELECT editor_user_id FROM \`Series_Tantou_Editor\` WHERE series_id = ? AND unassigned_at IS NULL`,
          [period.series_id],
        );

        for (const editor of editors) {
          await this.notifications.notify(
            editor.editor_user_id,
            NotificationType.RISK_ALERT,
            'Series được phụ trách đang ở mức rủi ro cao',
            `Điểm trung bình ${total.toFixed(2)}`,
            'Series',
            period.series_id,
          );
        }
      }
    }

    return {
      seriesId: period.series_id,
      total,
      risk,
      rankPosition,
    };
  }

  async leaderboard() {
    return this.db.query<{
      id: number;
      title: string;
      status: string;
      rankPosition: number | null;
      score: number | null;
      riskLevel: string | null;
    }>(
      `SELECT
        s.series_id AS id,
        s.title,
        s.series_status AS status,
        r.rank_position AS rankPosition,
        r.total_score AS score,
        r.risk_level AS riskLevel
       FROM \`Series\` s
       LEFT JOIN \`Ranking\` r ON r.series_id=s.series_id
        AND r.vote_period_id=(
          SELECT vp.vote_period_id
          FROM \`Vote_Period\` vp
          WHERE vp.series_id=s.series_id
          ORDER BY vp.period_end_date DESC
          LIMIT 1
        )
       ORDER BY (r.rank_position IS NULL), r.rank_position`,
    );
  }
}

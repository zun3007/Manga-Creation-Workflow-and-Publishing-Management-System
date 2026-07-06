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
    this.validateVotePeriodDates(dto.startDate, dto.endDate);

    const duplicate = await this.db.queryOne<{ vote_period_id: number }>(
      `SELECT vote_period_id
       FROM \`Vote_Period\`
       WHERE series_id=?
         AND ranking_period_type=?
         AND DATE(period_start_date)=DATE(?)
       LIMIT 1`,
      [dto.seriesId, dto.periodType, dto.startDate],
    );

    if (duplicate) {
      throw new BadRequestException(
        'Kỳ bình chọn cho series này, loại kỳ này và ngày mở này đã tồn tại',
      );
    }

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
      startDate: string;
      endDate: string;
      hasVoted: boolean;
    }>(
      `SELECT
        vp.vote_period_id AS id,
        vp.series_id AS seriesId,
        s.title AS series,
        vp.ranking_period_type AS periodType,
        vp.period_start_date AS startDate,
        vp.period_end_date AS endDate,
        EXISTS(SELECT 1 FROM \`Vote\` v WHERE v.vote_period_id=vp.vote_period_id AND v.board_user_id=?) AS hasVoted
       FROM \`Vote_Period\` vp
       JOIN \`Series\` s ON s.series_id=vp.series_id
       WHERE vp.status='OPEN'
         AND DATE(vp.period_end_date) >= CURRENT_DATE()
       ORDER BY vp.period_end_date`,
      [boardUserId],
    );
  }

  async castVote(boardUserId: number, dto: CreateVoteDto) {
    const period = await this.db.queryOne<{
      vote_period_id: number;
      status: string;
      period_start_date?: string;
      period_end_date?: string;
    }>(
      `SELECT vote_period_id, status, period_start_date, period_end_date FROM \`Vote_Period\` WHERE vote_period_id = ?`,
      [dto.votePeriodId],
    );

    if (!period || period.status !== 'OPEN') {
      throw new BadRequestException(
        'Kỳ bình chọn đã đóng hoặc không tồn tại',
      );
    }

    const today = this.todayDateOnly();
    if (
      period.period_start_date &&
      this.dateOnly(period.period_start_date) > today
    ) {
      throw new BadRequestException('Kỳ bình chọn chưa đến ngày mở');
    }
    if (period.period_end_date && this.dateOnly(period.period_end_date) < today) {
      throw new BadRequestException('Kỳ bình chọn đã quá ngày đóng');
    }

    await this.db.query(
      `INSERT INTO \`Vote\` (vote_period_id, board_user_id, score, comment)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE score=VALUES(score), comment=VALUES(comment)`,
      [dto.votePeriodId, boardUserId, dto.score, dto.comment ?? null],
    );

    const progress = await this.getBoardVoteProgress(dto.votePeriodId);
    if (progress.required > 0 && progress.received >= progress.required) {
      const ranking = await this.finalizePeriod(dto.votePeriodId);
      return {
        ok: true,
        closed: true,
        votesReceived: progress.received,
        votesRequired: progress.required,
        ranking,
      };
    }

    return {
      ok: true,
      closed: false,
      votesReceived: progress.received,
      votesRequired: progress.required,
    };
  }

  async closePeriod(periodId: number) {
    const progress = await this.getBoardVoteProgress(periodId);
    if (progress.required <= 0) {
      throw new BadRequestException('Không có Editorial Board đang hoạt động');
    }
    if (progress.received < progress.required) {
      throw new BadRequestException(
        `Chưa đủ phiếu bình chọn (${progress.received}/${progress.required})`,
      );
    }

    return this.finalizePeriod(periodId);
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
        latest.id,
        latest.title,
        latest.status,
        CASE
          WHEN latest.score IS NULL THEN NULL
          ELSE RANK() OVER (ORDER BY (latest.score IS NULL), latest.score DESC)
        END AS rankPosition,
        latest.score,
        latest.riskLevel
       FROM (
        SELECT
          s.series_id AS id,
          s.title,
          s.series_status AS status,
          r.total_score AS score,
          r.risk_level AS riskLevel
        FROM \`Series\` s
        LEFT JOIN \`Ranking\` r ON r.ranking_id=(
          SELECT latest_ranking.ranking_id
          FROM \`Ranking\` latest_ranking
          WHERE latest_ranking.series_id=s.series_id
          ORDER BY latest_ranking.calculated_at DESC, latest_ranking.ranking_id DESC
          LIMIT 1
        )
       ) latest
       ORDER BY (rankPosition IS NULL), rankPosition, latest.title`,
    );
  }

  private validateVotePeriodDates(startDate: string, endDate: string) {
    const start = this.dateOnly(startDate);
    const end = this.dateOnly(endDate);
    const today = this.todayDateOnly();

    if (start < today) {
      throw new BadRequestException('Ngày mở bình chọn không thể ở quá khứ');
    }

    if (end < start) {
      throw new BadRequestException(
        'Ngày đóng bình chọn không thể trước ngày mở bình chọn',
      );
    }
  }

  private async getBoardVoteProgress(periodId: number) {
    const row = await this.db.queryOne<{
      required: number | string | null;
      received: number | string | null;
    }>(
      `SELECT
        (SELECT COUNT(*) FROM \`User\` WHERE role='EDITORIAL_BOARD' AND is_activated=1) AS required,
        (SELECT COUNT(DISTINCT v.board_user_id)
         FROM \`Vote\` v
         JOIN \`User\` u ON u.user_id=v.board_user_id
         WHERE v.vote_period_id=?
           AND u.role='EDITORIAL_BOARD'
           AND u.is_activated=1) AS received`,
      [periodId],
    );

    return {
      required: Number(row?.required ?? 0),
      received: Number(row?.received ?? 0),
    };
  }

  private async finalizePeriod(periodId: number) {
    const period = await this.db.queryOne<{
      vote_period_id: number;
      series_id: number;
      ranking_period_type: 'WEEKLY' | 'MONTHLY';
      period_start_date: string;
      period_end_date: string;
      status: string;
    }>(
      `SELECT vote_period_id, series_id, ranking_period_type, period_start_date, period_end_date, status
       FROM \`Vote_Period\` WHERE vote_period_id = ?`,
      [periodId],
    );

    if (!period) {
      throw new NotFoundException('Vote period not found');
    }

    if (period.status !== 'CLOSED') {
      await this.db.query(
        `UPDATE \`Vote_Period\` SET status='CLOSED' WHERE vote_period_id=?`,
        [periodId],
      );
    }

    const rows = await this.db.query<{
      votePeriodId: number;
      seriesId: number;
      total: number | string | null;
    }>(
      `SELECT
        vp.vote_period_id AS votePeriodId,
        vp.series_id AS seriesId,
        AVG(v.score) AS total
       FROM \`Vote_Period\` vp
       JOIN \`Vote\` v ON v.vote_period_id=vp.vote_period_id
       JOIN \`User\` u ON u.user_id=v.board_user_id
       WHERE vp.status='CLOSED'
         AND u.role='EDITORIAL_BOARD'
         AND u.is_activated=1
         AND vp.ranking_period_type=?
         AND DATE(vp.period_start_date)=DATE(?)
         AND DATE(vp.period_end_date)=DATE(?)
       GROUP BY vp.vote_period_id, vp.series_id
       ORDER BY total DESC, vp.series_id ASC`,
      [
        period.ranking_period_type,
        period.period_start_date,
        period.period_end_date,
      ],
    );

    let previousTotal: number | null = null;
    let rankPosition = 0;
    let currentRanking:
      | {
          seriesId: number;
          total: number;
          risk: RiskLevel;
          rankPosition: number;
        }
      | undefined;

    for (const [index, row] of rows.entries()) {
      const total = Number(row.total ?? 0);
      if (previousTotal === null || total !== previousTotal) {
        rankPosition = index + 1;
      }
      previousTotal = total;

      const risk = this.riskLevelForScore(total);
      await this.db.query(
        `INSERT INTO \`Ranking\` (series_id, vote_period_id, rank_position, total_score, risk_level)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE rank_position=VALUES(rank_position), total_score=VALUES(total_score), risk_level=VALUES(risk_level)`,
        [row.seriesId, row.votePeriodId, rankPosition, total, risk],
      );

      if (row.votePeriodId === periodId) {
        currentRanking = {
          seriesId: row.seriesId,
          total,
          risk,
          rankPosition,
        };
      }
    }

    if (!currentRanking) {
      currentRanking = {
        seriesId: period.series_id,
        total: 0,
        risk: RiskLevel.HIGH,
        rankPosition: rows.length + 1,
      };
    }

    if (currentRanking.risk === RiskLevel.HIGH) {
      await this.markSeriesAtRiskAndNotify(
        currentRanking.seriesId,
        currentRanking.total,
      );
    }

    return currentRanking;
  }

  private riskLevelForScore(total: number): RiskLevel {
    if (total < 2.5) {
      return RiskLevel.HIGH;
    }
    if (total < 3.5) {
      return RiskLevel.MEDIUM;
    }
    return RiskLevel.LOW;
  }

  private async markSeriesAtRiskAndNotify(seriesId: number, total: number) {
    await this.db.query(
      `UPDATE \`Series\` SET series_status='AT_RISK' WHERE series_id=?`,
      [seriesId],
    );

    const series = await this.db.queryOne<{
      mangaka_user_id: number;
    }>(`SELECT mangaka_user_id FROM \`Series\` WHERE series_id=?`, [
      seriesId,
    ]);

    if (!series) {
      return;
    }

    await this.notifications.notify(
      series.mangaka_user_id,
      NotificationType.RISK_ALERT,
      'Series của bạn đang ở mức rủi ro cao',
      `Điểm trung bình ${total.toFixed(2)}`,
      'Series',
      seriesId,
    );

    const editors = await this.db.query<{ editor_user_id: number }>(
      `SELECT editor_user_id FROM \`Series_Tantou_Editor\` WHERE series_id = ? AND unassigned_at IS NULL`,
      [seriesId],
    );

    for (const editor of editors) {
      await this.notifications.notify(
        editor.editor_user_id,
        NotificationType.RISK_ALERT,
        'Series được phụ trách đang ở mức rủi ro cao',
        `Điểm trung bình ${total.toFixed(2)}`,
        'Series',
        seriesId,
      );
    }
  }

  private dateOnly(value: string | Date) {
    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }
    return String(value).slice(0, 10);
  }

  private todayDateOnly() {
    return new Date().toISOString().slice(0, 10);
  }
}

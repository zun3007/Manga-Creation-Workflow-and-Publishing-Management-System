import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, RiskLevel, Role } from '@manga/shared';
import { CreateVotePeriodDto } from './dto/create-vote-period.dto';
import { CreateVoteDto } from './dto/create-vote.dto';
import { ImportReaderVotesDto } from './dto/import-reader-votes.dto';
import { DeleteReaderVoteImportDto } from './dto/delete-reader-vote-import.dto';

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

  async importReaderVotesCsv(dto: ImportReaderVotesDto, importedByUserId?: number) {
    this.validateWeeklyReaderVotePeriod(dto.periodType, dto.startDate, dto.endDate);
    await this.ensureReaderVoteImportTable();
    await this.ensureReaderVoteRankingTable();
    await this.ensureReaderVoteImportDeleteTables();

    const duplicatedImport = await this.db.queryOne<{
      importId: number;
      fileName: string | null;
      startDate: string | Date;
      endDate: string | Date;
    }>(
      `SELECT
         import_id AS importId,
         file_name AS fileName,
         period_start_date AS startDate,
         period_end_date AS endDate
       FROM \`Reader_Vote_Import\`
       WHERE ranking_period_type = ?
         AND deleted_at IS NULL
         AND period_start_date < ?
         AND period_end_date > ?
       ORDER BY imported_at DESC, import_id DESC
       LIMIT 1`,
      [dto.periodType, dto.endDate, dto.startDate],
    );

    if (duplicatedImport) {
      const existingStart = this.dateOnly(duplicatedImport.startDate);
      const existingEnd = this.dateOnly(duplicatedImport.endDate);
      const fileLabel =
        duplicatedImport.fileName ?? `#${duplicatedImport.importId}`;
      throw new BadRequestException({
        code: 'READER_VOTE_IMPORT_PERIOD_CONFLICT',
        message: `Kỳ ${dto.startDate} → ${dto.endDate} bị trùng với kỳ đã import ${existingStart} → ${existingEnd} (${fileLabel}). Muốn import lại phải gửi yêu cầu xóa và được toàn bộ Board duyệt.`,
        conflictImport: {
          importId: Number(duplicatedImport.importId),
          fileName: duplicatedImport.fileName,
          startDate: existingStart,
          endDate: existingEnd,
        },
      });
    }

    const rows = this.parseReaderVoteCsv(dto.csv);
    const explicitIds = rows
      .map((row) => row.seriesId)
      .filter((id): id is number => Number.isInteger(id));
    const titles = rows.map((row) => row.seriesTitle);
    const clauses: string[] = [];
    const params: Array<number | string> = [];

    if (explicitIds.length > 0) {
      clauses.push(`series_id IN (${explicitIds.map(() => '?').join(',')})`);
      params.push(...explicitIds);
    }

    clauses.push(`title IN (${titles.map(() => '?').join(',')})`);
    params.push(...titles);

    const existingSeries = await this.db.query<{
      series_id: number;
      title: string;
      series_status: string;
      publication_year: number | string;
      chapter_count: number | string;
    }>(
      `SELECT
         s.series_id,
         s.title,
         s.series_status,
         YEAR(s.created_at) AS publication_year,
         (SELECT COUNT(*) FROM \`Chapter\` c WHERE c.series_id = s.series_id) AS chapter_count
       FROM \`Series\` s
       WHERE ${clauses.join(' OR ')}`,
      params,
    );
    const seriesById = new Map(
      existingSeries.map((series) => [Number(series.series_id), series]),
    );
    const seriesByTitle = new Map(
      existingSeries.map((series) => [
        series.title.trim().toLowerCase(),
        series,
      ]),
    );

    const resolvedRows = rows.map((row) => {
      const series =
        (row.seriesId ? seriesById.get(row.seriesId) : undefined) ??
        seriesByTitle.get(row.seriesTitle.trim().toLowerCase());

      if (!series) {
        throw new BadRequestException(
          `Không tìm thấy series trong hệ thống: ${row.seriesTitle}`,
        );
      }

      return {
        ...row,
        seriesId: Number(series.series_id),
        systemSeriesTitle: series.title,
        systemSeriesStatus: series.series_status,
        systemPublicationYear: Number(series.publication_year),
        systemChapterCount: Number(series.chapter_count ?? 0),
      };
    });

    const duplicatedResolvedIds = resolvedRows
      .map((row) => row.seriesId)
      .filter((id, index, all) => all.indexOf(id) !== index);

    if (duplicatedResolvedIds.length > 0) {
      throw new BadRequestException(
        `CSV có series trùng sau khi match DB: ${[...new Set(duplicatedResolvedIds)].join(', ')}`,
      );
    }

    const rankedRows = [...resolvedRows].sort((a, b) => {
      if (b.averageReaderStars !== a.averageReaderStars) {
        return b.averageReaderStars - a.averageReaderStars;
      }
      if (b.sales !== a.sales) {
        return b.sales - a.sales;
      }
      return a.seriesId - b.seriesId;
    });

    let previousScore: number | null = null;
    let rankPosition = 0;
    let importId = 0;
    const imported = await this.db.transaction(async (tx) => {
      const results: Array<{
        seriesId: number;
        readerRankingId: number;
        rankPosition: number;
        seriesTitle: string;
        status: string;
        publicationYear: number;
        chapterCount: number;
        author: string;
        genres: string;
        averageReaderStars: number;
        sales: number;
        riskLevel: RiskLevel;
      }> = [];

      importId = await tx.insert(
        `INSERT INTO \`Reader_Vote_Import\`
          (file_name, csv_content, ranking_period_type, period_start_date, period_end_date, imported_by_user_id, imported_count)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          dto.fileName ?? null,
          dto.csv,
          dto.periodType,
          dto.startDate,
          dto.endDate,
          importedByUserId ?? null,
          rankedRows.length,
        ],
      );

      for (const [index, row] of rankedRows.entries()) {
        if (previousScore === null || row.averageReaderStars !== previousScore) {
          rankPosition = index + 1;
        }
        previousScore = row.averageReaderStars;

        const riskLevel = this.riskLevelForScore(row.averageReaderStars);
        const readerRankingId = await tx.insert(
          `INSERT INTO \`Reader_Vote_Ranking\`
            (import_id, series_id, ranking_period_type, period_start_date, period_end_date,
             rank_position, reader_star_avg, sales_amount, publication_year,
             author_name, genres, risk_level)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             reader_ranking_id = LAST_INSERT_ID(reader_ranking_id),
             import_id = VALUES(import_id),
             period_end_date = VALUES(period_end_date),
             rank_position = VALUES(rank_position),
             reader_star_avg = VALUES(reader_star_avg),
             sales_amount = VALUES(sales_amount),
             publication_year = VALUES(publication_year),
             author_name = VALUES(author_name),
             genres = VALUES(genres),
             risk_level = VALUES(risk_level),
             calculated_at = CURRENT_TIMESTAMP`,
          [
            importId,
            row.seriesId,
            dto.periodType,
            dto.startDate,
            dto.endDate,
            rankPosition,
            row.averageReaderStars,
            row.sales,
            row.systemPublicationYear,
            row.author,
            row.genres,
            riskLevel,
          ],
        );

        results.push({
          seriesId: row.seriesId,
          readerRankingId,
          rankPosition,
          seriesTitle: row.systemSeriesTitle,
          status: String(row.systemSeriesStatus),
          publicationYear: row.systemPublicationYear,
          chapterCount: row.systemChapterCount,
          author: row.author,
          genres: row.genres,
          averageReaderStars: row.averageReaderStars,
          sales: row.sales,
          riskLevel,
        });
      }

      return results;
    });

    for (const row of imported) {
      if (row.riskLevel === RiskLevel.HIGH) {
        await this.markSeriesAtRiskAndNotify(row.seriesId, row.averageReaderStars);
      }
    }

    return {
      importId,
      fileName: dto.fileName ?? null,
      importedCount: imported.length,
      periodType: dto.periodType,
      startDate: dto.startDate,
      endDate: dto.endDate,
      rankings: imported,
    };
  }

  async readerVoteImportHistory() {
    await this.ensureReaderVoteImportTable();

    const rows = await this.db.query<{
      importId: number | string;
      fileName: string | null;
      periodType: 'WEEKLY' | 'MONTHLY';
      startDate: string | Date;
      endDate: string | Date;
      importedCount: number | string;
      importedAt: string | Date;
      deletedAt: string | Date | null;
      importedByName: string | null;
    }>(
      `SELECT
         i.import_id AS importId,
         i.file_name AS fileName,
         i.ranking_period_type AS periodType,
         i.period_start_date AS startDate,
         i.period_end_date AS endDate,
         i.imported_count AS importedCount,
         i.imported_at AS importedAt,
         i.deleted_at AS deletedAt,
         u.full_name AS importedByName
       FROM \`Reader_Vote_Import\` i
       LEFT JOIN \`User\` u ON u.user_id = i.imported_by_user_id
       ORDER BY i.period_start_date DESC, i.period_end_date DESC, i.import_id DESC`,
    );

    return rows.map((row) => ({
      importId: Number(row.importId),
      fileName: row.fileName,
      periodType: row.periodType,
      startDate: this.dateOnly(row.startDate),
      endDate: this.dateOnly(row.endDate),
      importedCount: Number(row.importedCount),
      importedAt: row.importedAt,
      deletedAt: row.deletedAt,
      importedByName: row.importedByName,
      status: row.deletedAt ? 'DELETED' : 'IMPORTED',
    }));
  }

  async latestReaderVoteRankings(currentUserId?: number) {
    await this.ensureReaderVoteImportTable();
    await this.ensureReaderVoteRankingTable();
    await this.ensureReaderVoteImportDeleteTables();

    const latestImport = await this.db.queryOne<{
      importId: number;
      fileName: string | null;
      periodType: 'WEEKLY' | 'MONTHLY';
      startDate: string | Date;
      endDate: string | Date;
      importedAt: string | Date;
      importedCount: number | string;
    }>(
      `SELECT
         import_id AS importId,
         file_name AS fileName,
         ranking_period_type AS periodType,
         period_start_date AS startDate,
         period_end_date AS endDate,
         imported_at AS importedAt,
         imported_count AS importedCount
       FROM \`Reader_Vote_Import\`
       WHERE deleted_at IS NULL
       ORDER BY period_start_date DESC, period_end_date DESC, import_id DESC
       LIMIT 1`,
    );

    await this.syncReaderVotePublicationYears(
      latestImport
        ? {
            importId: Number(latestImport.importId),
            periodType: latestImport.periodType,
            startDate: this.dateOnly(latestImport.startDate),
            endDate: this.dateOnly(latestImport.endDate),
          }
        : null,
    );

    const rows = await this.db.query<{
      seriesId: number;
      readerRankingId: number;
      rankPosition: number;
      seriesTitle: string;
      status: string;
      publicationYear: number | string;
      chapterCount: number | string;
      author: string;
      genres: string;
      averageReaderStars: number | string;
      sales: number | string;
      riskLevel: RiskLevel;
      periodType: 'WEEKLY' | 'MONTHLY';
      startDate: string | Date;
      endDate: string | Date;
    }>(
      `SELECT
         r.series_id AS seriesId,
         r.reader_ranking_id AS readerRankingId,
         r.rank_position AS rankPosition,
         s.title AS seriesTitle,
         s.series_status AS status,
         YEAR(s.created_at) AS publicationYear,
         (SELECT COUNT(*) FROM \`Chapter\` c WHERE c.series_id = r.series_id) AS chapterCount,
         r.author_name AS author,
         r.genres,
         r.reader_star_avg AS averageReaderStars,
         r.sales_amount AS sales,
         r.risk_level AS riskLevel,
         r.ranking_period_type AS periodType,
         r.period_start_date AS startDate,
         r.period_end_date AS endDate
       FROM \`Reader_Vote_Ranking\` r
       JOIN \`Series\` s ON s.series_id = r.series_id
       ${latestImport ? '' : `JOIN (
         SELECT ranking_period_type, period_start_date
         FROM \`Reader_Vote_Ranking\`
         ORDER BY period_start_date DESC, period_end_date DESC, reader_ranking_id DESC
         LIMIT 1
       ) latest
         ON latest.ranking_period_type = r.ranking_period_type
        AND latest.period_start_date = r.period_start_date`}
       ${
         latestImport
           ? `WHERE r.import_id = ?
              OR (
                r.import_id IS NULL
                AND r.ranking_period_type = ?
                AND r.period_start_date = ?
                AND r.period_end_date = ?
              )`
           : ''
       }
       ORDER BY r.rank_position ASC, r.reader_star_avg DESC, r.sales_amount DESC, s.title ASC`,
      latestImport
        ? [
            Number(latestImport.importId),
            latestImport.periodType,
            this.dateOnly(latestImport.startDate),
            this.dateOnly(latestImport.endDate),
          ]
        : [],
    );

    if (rows.length === 0) {
      return null;
    }

    return {
      importId: latestImport ? Number(latestImport.importId) : null,
      fileName: latestImport?.fileName ?? null,
      importedAt: latestImport ? this.dateOnly(latestImport.importedAt) : null,
      importedCount: latestImport ? Number(latestImport.importedCount) : rows.length,
      periodType: latestImport?.periodType ?? rows[0].periodType,
      startDate: this.dateOnly(latestImport?.startDate ?? rows[0].startDate),
      endDate: this.dateOnly(latestImport?.endDate ?? rows[0].endDate),
      deleteRequest: latestImport
        ? await this.getDeleteRequestSummary(
            Number(latestImport.importId),
            currentUserId,
          )
        : null,
      rankings: rows.map((row) => ({
        seriesId: Number(row.seriesId),
        readerRankingId: Number(row.readerRankingId),
        rankPosition: Number(row.rankPosition),
        seriesTitle: row.seriesTitle,
        status: row.status,
        publicationYear: Number(row.publicationYear),
        chapterCount: Number(row.chapterCount ?? 0),
        author: row.author,
        genres: row.genres,
        averageReaderStars: Number(row.averageReaderStars),
        sales: Number(row.sales),
        riskLevel: row.riskLevel,
      })),
    };
  }

  private async syncReaderVotePublicationYears(
    latestImport: {
      importId: number;
      periodType: 'WEEKLY' | 'MONTHLY';
      startDate: string;
      endDate: string;
    } | null,
  ) {
    if (latestImport) {
      await this.attachLegacyReaderRankingsToImport(latestImport);
      await this.db.query(
        `UPDATE \`Reader_Vote_Ranking\` r
         JOIN \`Series\` s ON s.series_id = r.series_id
         SET r.publication_year = YEAR(s.created_at)
         WHERE r.import_id = ?`,
        [latestImport.importId],
      );
      return;
    }

    await this.db.query(
      `UPDATE \`Reader_Vote_Ranking\` r
       JOIN \`Series\` s ON s.series_id = r.series_id
       SET r.publication_year = YEAR(s.created_at)`,
    );
  }

  private async attachLegacyReaderRankingsToImport(latestImport: {
    importId: number;
    periodType: 'WEEKLY' | 'MONTHLY';
    startDate: string;
    endDate: string;
  }) {
    await this.db.query(
      `UPDATE \`Reader_Vote_Ranking\`
       SET import_id = ?
       WHERE import_id IS NULL
         AND ranking_period_type = ?
         AND period_start_date = ?
         AND period_end_date = ?`,
      [
        latestImport.importId,
        latestImport.periodType,
        latestImport.startDate,
        latestImport.endDate,
      ],
    );
  }

  async requestDeleteReaderVoteImport(
    importId: number,
    requestedByUserId: number,
    dto: DeleteReaderVoteImportDto,
  ) {
    await this.ensureReaderVoteImportTable();
    await this.ensureReaderVoteRankingTable();
    await this.ensureReaderVoteImportDeleteTables();

    const importRow = await this.findActiveReaderVoteImport(importId);
    const existing = await this.db.queryOne<{ status: string }>(
      `SELECT status
       FROM \`Reader_Vote_Import_Delete_Request\`
       WHERE import_id = ? AND status = 'PENDING'`,
      [importId],
    );

    if (existing) {
      throw new BadRequestException('Import này đã có yêu cầu xóa đang chờ Board duyệt');
    }

    const reason = dto.reason?.trim() || 'Board request delete imported reader vote data';
    await this.db.query(
      `INSERT INTO \`Reader_Vote_Import_Delete_Request\`
        (import_id, requested_by_user_id, reason, status)
       VALUES (?, ?, ?, 'PENDING')
       ON DUPLICATE KEY UPDATE
        requested_by_user_id = VALUES(requested_by_user_id),
        reason = VALUES(reason),
        status = 'PENDING',
        requested_at = CURRENT_TIMESTAMP,
        approved_at = NULL`,
      [importId, requestedByUserId, reason],
    );

    const boardUsers = await this.activeBoardUsersExcept(requestedByUserId);
    for (const board of boardUsers) {
      await this.notifications.notify(
        board.user_id,
        NotificationType.GENERAL,
        `Yêu cầu xóa dữ liệu vote độc giả Import #${importId}`,
        `Kỳ ${this.dateOnly(importRow.startDate)} → ${this.dateOnly(importRow.endDate)}. Lý do: ${reason}`,
        'Reader_Vote_Import',
        importId,
      );
    }

    if (boardUsers.length === 0) {
      await this.finalizeReaderVoteImportDeletion(importId);
    }

    return {
      ok: true,
      deleteRequest: await this.getDeleteRequestSummary(importId, requestedByUserId),
    };
  }

  async approveDeleteReaderVoteImport(importId: number, boardUserId: number) {
    await this.ensureReaderVoteImportTable();
    await this.ensureReaderVoteRankingTable();
    await this.ensureReaderVoteImportDeleteTables();
    await this.findActiveReaderVoteImport(importId);

    const request = await this.db.queryOne<{
      requestedByUserId: number;
      status: string;
    }>(
      `SELECT requested_by_user_id AS requestedByUserId, status
       FROM \`Reader_Vote_Import_Delete_Request\`
       WHERE import_id = ?`,
      [importId],
    );

    if (!request || request.status !== 'PENDING') {
      throw new BadRequestException('Không có yêu cầu xóa đang chờ duyệt');
    }
    if (Number(request.requestedByUserId) === boardUserId) {
      throw new BadRequestException('Tài khoản gửi yêu cầu xóa không cần duyệt yêu cầu này');
    }

    await this.db.query(
      `INSERT IGNORE INTO \`Reader_Vote_Import_Delete_Approval\`
        (import_id, board_user_id)
       VALUES (?, ?)`,
      [importId, boardUserId],
    );

    const summary = await this.getDeleteRequestSummary(importId, boardUserId);
    if (
      summary &&
      summary.status === 'PENDING' &&
      summary.approvalCount >= summary.requiredApprovals
    ) {
      await this.finalizeReaderVoteImportDeletion(importId);
    }

    return {
      ok: true,
      deleteRequest: await this.getDeleteRequestSummary(importId, boardUserId),
    };
  }

  async pendingReaderVoteImportDeleteRequests(currentUserId: number) {
    await this.ensureReaderVoteImportTable();
    await this.ensureReaderVoteImportDeleteTables();

    const requests = await this.db.query<{
      importId: number;
      fileName: string | null;
      periodType: 'WEEKLY' | 'MONTHLY';
      startDate: string | Date;
      endDate: string | Date;
      importedAt: string | Date;
    }>(
      `SELECT
        i.import_id AS importId,
        i.file_name AS fileName,
        i.ranking_period_type AS periodType,
        i.period_start_date AS startDate,
        i.period_end_date AS endDate,
        i.imported_at AS importedAt
       FROM \`Reader_Vote_Import_Delete_Request\` r
       JOIN \`Reader_Vote_Import\` i ON i.import_id = r.import_id
       WHERE r.status = 'PENDING'
         AND i.deleted_at IS NULL
       ORDER BY r.requested_at DESC, i.period_start_date DESC, i.import_id DESC`,
    );

    const result: Array<{
      importId: number;
      requestedByUserId: number;
      requestedByName: string | null;
      reason: string | null;
      status: string;
      requestedAt: string | Date;
      approvedAt: string | Date | null;
      requiredApprovals: number;
      approvalCount: number;
      approvedByCurrentUser: boolean;
      canCurrentUserApprove: boolean;
      fileName: string | null;
      periodType: 'WEEKLY' | 'MONTHLY';
      startDate: string;
      endDate: string;
      importedAt: string;
    }> = [];
    for (const request of requests) {
      const summary = await this.getDeleteRequestSummary(
        Number(request.importId),
        currentUserId,
      );
      if (!summary) continue;
      result.push({
        ...summary,
        fileName: request.fileName,
        periodType: request.periodType,
        startDate: this.dateOnly(request.startDate),
        endDate: this.dateOnly(request.endDate),
        importedAt: this.dateOnly(request.importedAt),
      });
    }
    return result;
  }

  private async findActiveReaderVoteImport(importId: number) {
    const importRow = await this.db.queryOne<{
      importId: number;
      fileName: string | null;
      periodType: 'WEEKLY' | 'MONTHLY';
      startDate: string | Date;
      endDate: string | Date;
    }>(
      `SELECT
        import_id AS importId,
        file_name AS fileName,
        ranking_period_type AS periodType,
        period_start_date AS startDate,
        period_end_date AS endDate
       FROM \`Reader_Vote_Import\`
       WHERE import_id = ? AND deleted_at IS NULL`,
      [importId],
    );

    if (!importRow) {
      throw new NotFoundException('Không tìm thấy import đang hoạt động');
    }
    return importRow;
  }

  private async getDeleteRequestSummary(importId: number, currentUserId?: number) {
    const request = await this.db.queryOne<{
      importId: number;
      requestedByUserId: number;
      requestedByName: string | null;
      reason: string | null;
      status: string;
      requestedAt: string | Date;
      approvedAt: string | Date | null;
    }>(
      `SELECT
        r.import_id AS importId,
        r.requested_by_user_id AS requestedByUserId,
        u.full_name AS requestedByName,
        r.reason,
        r.status,
        r.requested_at AS requestedAt,
        r.approved_at AS approvedAt
       FROM \`Reader_Vote_Import_Delete_Request\` r
       LEFT JOIN \`User\` u ON u.user_id = r.requested_by_user_id
       WHERE r.import_id = ?`,
      [importId],
    );

    if (!request) return null;

    const counts = await this.db.queryOne<{
      requiredApprovals: number | string;
      approvalCount: number | string;
      approvedByCurrentUser: number | string;
    }>(
      `SELECT
        (SELECT COUNT(*) FROM \`User\` b
         WHERE b.role = ? AND b.is_activated = 1 AND b.user_id <> r.requested_by_user_id) AS requiredApprovals,
        (SELECT COUNT(*) FROM \`Reader_Vote_Import_Delete_Approval\` a
         JOIN \`User\` b ON b.user_id = a.board_user_id
         WHERE a.import_id = r.import_id AND b.role = ? AND b.is_activated = 1) AS approvalCount,
        (SELECT COUNT(*) FROM \`Reader_Vote_Import_Delete_Approval\` a
         WHERE a.import_id = r.import_id AND a.board_user_id = ?) AS approvedByCurrentUser
       FROM \`Reader_Vote_Import_Delete_Request\` r
       WHERE r.import_id = ?`,
      [
        Role.EDITORIAL_BOARD,
        Role.EDITORIAL_BOARD,
        currentUserId ?? 0,
        importId,
      ],
    );

    return {
      importId: Number(request.importId),
      requestedByUserId: Number(request.requestedByUserId),
      requestedByName: request.requestedByName,
      reason: request.reason,
      status: request.status,
      requestedAt: request.requestedAt,
      approvedAt: request.approvedAt,
      requiredApprovals: Number(counts?.requiredApprovals ?? 0),
      approvalCount: Number(counts?.approvalCount ?? 0),
      approvedByCurrentUser: Number(counts?.approvedByCurrentUser ?? 0) > 0,
      canCurrentUserApprove:
        currentUserId !== undefined &&
        Number(request.requestedByUserId) !== currentUserId &&
        request.status === 'PENDING' &&
        Number(counts?.approvedByCurrentUser ?? 0) === 0,
    };
  }

  private async activeBoardUsersExcept(excludedUserId: number) {
    return this.db.query<{ user_id: number }>(
      `SELECT user_id FROM \`User\`
       WHERE role = ? AND is_activated = 1 AND user_id <> ?`,
      [Role.EDITORIAL_BOARD, excludedUserId],
    );
  }

  private async finalizeReaderVoteImportDeletion(importId: number) {
    const importRow = await this.findActiveReaderVoteImport(importId);
    await this.db.transaction(async (tx) => {
      await tx.query(
        `DELETE FROM \`Reader_Vote_Ranking\`
         WHERE import_id = ?
            OR (
              import_id IS NULL
              AND ranking_period_type = ?
              AND period_start_date = ?
              AND period_end_date = ?
            )`,
        [
          importId,
          importRow.periodType,
          this.dateOnly(importRow.startDate),
          this.dateOnly(importRow.endDate),
        ],
      );
      await tx.query(
        `UPDATE \`Reader_Vote_Import\`
         SET deleted_at = CURRENT_TIMESTAMP
         WHERE import_id = ?`,
        [importId],
      );
      await tx.query(
        `UPDATE \`Reader_Vote_Import_Delete_Request\`
         SET status = 'APPROVED', approved_at = CURRENT_TIMESTAMP
         WHERE import_id = ?`,
        [importId],
      );
    });
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

  private async ensureReaderVoteImportTable() {
    await this.db.query(
      `CREATE TABLE IF NOT EXISTS \`Reader_Vote_Import\` (
        \`import_id\` BIGINT AUTO_INCREMENT,
        \`file_name\` VARCHAR(255) NULL,
        \`csv_content\` MEDIUMTEXT NOT NULL,
        \`ranking_period_type\` ENUM('WEEKLY','MONTHLY') NOT NULL,
        \`period_start_date\` DATE NOT NULL,
        \`period_end_date\` DATE NOT NULL,
        \`imported_by_user_id\` BIGINT NULL,
        \`imported_count\` INT NOT NULL DEFAULT 0,
        \`imported_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`deleted_at\` DATETIME NULL,
        PRIMARY KEY (\`import_id\`),
        FOREIGN KEY (\`imported_by_user_id\`) REFERENCES \`User\`(\`user_id\`),
        INDEX \`idx_reader_vote_import_latest\` (\`imported_at\`, \`import_id\`),
        INDEX \`idx_reader_vote_import_period\` (\`ranking_period_type\`, \`period_start_date\`)
      )`,
    );
    await this.ensureReaderVoteImportDeleteColumn();
  }

  private async ensureReaderVoteImportDeleteColumn() {
    const column = await this.db.queryOne<{ count: number | string }>(
      `SELECT COUNT(*) AS count
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'Reader_Vote_Import'
         AND COLUMN_NAME = 'deleted_at'`,
    );

    if (Number(column?.count ?? 0) === 0) {
      await this.db.query(
        `ALTER TABLE \`Reader_Vote_Import\`
         ADD COLUMN \`deleted_at\` DATETIME NULL AFTER \`imported_at\``,
      );
    }
  }

  private async ensureReaderVoteImportDeleteTables() {
    await this.db.query(
      `CREATE TABLE IF NOT EXISTS \`Reader_Vote_Import_Delete_Request\` (
        \`import_id\` BIGINT NOT NULL,
        \`requested_by_user_id\` BIGINT NOT NULL,
        \`reason\` VARCHAR(1000) NULL,
        \`status\` ENUM('PENDING','APPROVED') NOT NULL DEFAULT 'PENDING',
        \`requested_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`approved_at\` DATETIME NULL,
        PRIMARY KEY (\`import_id\`),
        FOREIGN KEY (\`import_id\`) REFERENCES \`Reader_Vote_Import\`(\`import_id\`),
        FOREIGN KEY (\`requested_by_user_id\`) REFERENCES \`User\`(\`user_id\`)
      )`,
    );
    await this.db.query(
      `CREATE TABLE IF NOT EXISTS \`Reader_Vote_Import_Delete_Approval\` (
        \`import_id\` BIGINT NOT NULL,
        \`board_user_id\` BIGINT NOT NULL,
        \`approved_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`import_id\`, \`board_user_id\`),
        FOREIGN KEY (\`import_id\`) REFERENCES \`Reader_Vote_Import_Delete_Request\`(\`import_id\`),
        FOREIGN KEY (\`board_user_id\`) REFERENCES \`User\`(\`user_id\`)
      )`,
    );
  }

  private async ensureReaderVoteRankingTable() {
    await this.db.query(
      `CREATE TABLE IF NOT EXISTS \`Reader_Vote_Ranking\` (
        \`reader_ranking_id\` BIGINT AUTO_INCREMENT,
        \`import_id\` BIGINT NULL,
        \`series_id\` BIGINT NOT NULL,
        \`ranking_period_type\` ENUM('WEEKLY','MONTHLY') NOT NULL,
        \`period_start_date\` DATE NOT NULL,
        \`period_end_date\` DATE NOT NULL,
        \`rank_position\` INT NOT NULL,
        \`reader_star_avg\` DECIMAL(5,2) NOT NULL,
        \`sales_amount\` DECIMAL(15,2) NOT NULL DEFAULT 0,
        \`publication_year\` INT NOT NULL,
        \`author_name\` VARCHAR(200) NOT NULL,
        \`genres\` VARCHAR(500) NOT NULL,
        \`risk_level\` ENUM('LOW','MEDIUM','HIGH') NOT NULL,
        \`calculated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`reader_ranking_id\`),
        FOREIGN KEY (\`import_id\`) REFERENCES \`Reader_Vote_Import\`(\`import_id\`),
        FOREIGN KEY (\`series_id\`) REFERENCES \`Series\`(\`series_id\`),
        INDEX \`idx_reader_ranking_import\` (\`import_id\`),
        UNIQUE KEY \`uq_reader_ranking_period\` (\`series_id\`, \`ranking_period_type\`, \`period_start_date\`)
      )`,
    );
    await this.ensureReaderVoteRankingImportColumn();
  }

  private async ensureReaderVoteRankingImportColumn() {
    const column = await this.db.queryOne<{ count: number | string }>(
      `SELECT COUNT(*) AS count
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'Reader_Vote_Ranking'
         AND COLUMN_NAME = 'import_id'`,
    );

    if (Number(column?.count ?? 0) === 0) {
      await this.db.query(
        `ALTER TABLE \`Reader_Vote_Ranking\`
         ADD COLUMN \`import_id\` BIGINT NULL AFTER \`reader_ranking_id\``,
      );
    }

    const index = await this.db.queryOne<{ count: number | string }>(
      `SELECT COUNT(*) AS count
       FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'Reader_Vote_Ranking'
         AND INDEX_NAME = 'idx_reader_ranking_import'`,
    );

    if (Number(index?.count ?? 0) === 0) {
      await this.db.query(
        `ALTER TABLE \`Reader_Vote_Ranking\`
         ADD INDEX \`idx_reader_ranking_import\` (\`import_id\`)`,
      );
    }
  }

  private validateWeeklyReaderVotePeriod(
    periodType: 'WEEKLY' | 'MONTHLY',
    startDate: string,
    endDate: string,
  ) {
    if (periodType !== 'WEEKLY') {
      throw new BadRequestException('Loại kỳ vote độc giả hiện chỉ hỗ trợ hàng tuần');
    }

    const start = this.dateOnly(startDate);
    const end = this.dateOnly(endDate);
    const expectedEnd = this.addDays(start, 7);

    if (end < start) {
      throw new BadRequestException(
        'Ngày kết thúc kỳ phát hành không thể trước ngày bắt đầu',
      );
    }

    if (end !== expectedEnd) {
      throw new BadRequestException(
        `Kỳ hàng tuần phải kết thúc đúng 1 tuần sau ngày bắt đầu (${expectedEnd})`,
      );
    }
  }

  private parseReaderVoteCsv(csv: string) {
    const parsedRows = this.parseCsv(csv);
    if (parsedRows.length < 2) {
      throw new BadRequestException('CSV phải có header và ít nhất 1 dòng dữ liệu');
    }

    const headers = parsedRows[0].map((header) => this.normalizeHeader(header));
    const seriesIdIndex = headers.indexOf('seriesid');
    const seriesTitleIndex = this.headerIndex(headers, [
      'seriestitle',
      'seriesname',
      'series',
      'tenseries',
    ]);
    const authorIndex = this.headerIndex(headers, ['author', 'tacgia']);
    const genresIndex = this.headerIndex(headers, ['genres', 'genre', 'theloai']);
    const averageReaderStarsIndex = this.headerIndex(headers, [
      'averagereaderstars',
      'readerstars',
      'averagestars',
      'stars',
      'sosao',
    ]);
    const salesIndex = this.headerIndex(headers, ['sales', 'doanhso']);

    if (
      seriesTitleIndex < 0 ||
      authorIndex < 0 ||
      genresIndex < 0 ||
      averageReaderStarsIndex < 0 ||
      salesIndex < 0
    ) {
      throw new BadRequestException(
        'CSV cần các cột: seriesTitle,author,genres,averageReaderStars,sales',
      );
    }

    const seenSeries = new Set<string>();
    return parsedRows.slice(1).map((columns, index) => {
      const rowNumber = index + 2;
      const seriesId =
        seriesIdIndex >= 0 && columns[seriesIdIndex]
          ? Number(columns[seriesIdIndex])
          : undefined;
      const seriesTitle = columns[seriesTitleIndex]?.trim();
      const author = columns[authorIndex]?.trim();
      const genres = columns[genresIndex]?.trim();
      const averageReaderStars = Number(columns[averageReaderStarsIndex]);
      const sales = Number(columns[salesIndex]);

      if (seriesId !== undefined && (!Number.isInteger(seriesId) || seriesId <= 0)) {
        throw new BadRequestException(`Dòng ${rowNumber}: seriesId không hợp lệ`);
      }
      if (!seriesTitle) {
        throw new BadRequestException(`Dòng ${rowNumber}: tên series không hợp lệ`);
      }
      if (!author) {
        throw new BadRequestException(`Dòng ${rowNumber}: tác giả không hợp lệ`);
      }
      if (!genres) {
        throw new BadRequestException(`Dòng ${rowNumber}: thể loại không hợp lệ`);
      }
      if (
        !Number.isFinite(averageReaderStars) ||
        averageReaderStars < 0 ||
        averageReaderStars > 5
      ) {
        throw new BadRequestException(
          `Dòng ${rowNumber}: số sao trung bình phải trong khoảng 0-5`,
        );
      }
      if (!Number.isFinite(sales) || sales < 0) {
        throw new BadRequestException(`Dòng ${rowNumber}: doanh số không hợp lệ`);
      }

      const duplicateKey = seriesId ? String(seriesId) : seriesTitle.toLowerCase();
      if (seenSeries.has(duplicateKey)) {
        throw new BadRequestException(`Dòng ${rowNumber}: series bị trùng`);
      }
      seenSeries.add(duplicateKey);

      return {
        seriesId,
        seriesTitle,
        author,
        genres,
        averageReaderStars: Number(averageReaderStars.toFixed(2)),
        sales: Number(sales.toFixed(2)),
      };
    });
  }

  private parseCsv(csv: string): string[][] {
    const rows: string[][] = [];
    let current = '';
    let row: string[] = [];
    let inQuotes = false;

    for (let i = 0; i < csv.length; i += 1) {
      const char = csv[i];
      const next = csv[i + 1];

      if (char === '"' && inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && next === '\n') {
          i += 1;
        }
        row.push(current.trim());
        current = '';
        if (row.some((value) => value.length > 0)) {
          rows.push(row);
        }
        row = [];
      } else {
        current += char;
      }
    }

    row.push(current.trim());
    if (row.some((value) => value.length > 0)) {
      rows.push(row);
    }

    if (inQuotes) {
      throw new BadRequestException('CSV có dấu nháy không hợp lệ');
    }

    return rows;
  }

  private normalizeHeader(header: string) {
    return header.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private headerIndex(headers: string[], candidates: string[]) {
    return headers.findIndex((header) => candidates.includes(header));
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
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return String(value).slice(0, 10);
  }

  private todayDateOnly() {
    return new Date().toISOString().slice(0, 10);
  }

  private addDays(date: string, days: number) {
    const parsed = new Date(`${date}T00:00:00.000Z`);
    parsed.setUTCDate(parsed.getUTCDate() + days);
    return parsed.toISOString().slice(0, 10);
  }
}

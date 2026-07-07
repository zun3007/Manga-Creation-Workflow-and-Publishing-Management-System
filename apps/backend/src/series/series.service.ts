import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  AnnotationCategory,
  AnnotationTargetType,
  NotificationType,
  Role,
  SeriesStatus,
} from '@manga/shared';
import { CreateDefenseReportDto } from './dto/create-defense-report.dto';

@Injectable()
export class SeriesService implements OnModuleInit {
  constructor(
    private readonly db: DbService,
    private readonly notifications: NotificationsService,
  ) {}

  async onModuleInit() {
    await this.ensureSeriesAnnotationTargetType();
  }

  async listMine(userId: number) {
    return this.db.query(
      `SELECT
        s.series_id AS id,
        s.title,
        s.publication_frequency AS frequency,
        s.series_status AS status,
        (SELECT COUNT(*) FROM \`Chapter\` c WHERE c.series_id = s.series_id) AS chapters,
        GROUP_CONCAT(g.genre_name SEPARATOR ',') AS genres
       FROM \`Series\` s
       LEFT JOIN \`Series_Genre\` sg ON sg.series_id = s.series_id
       LEFT JOIN \`Genre\` g ON g.genre_id = sg.genre_id
       WHERE s.mangaka_user_id = ?
       GROUP BY s.series_id
       ORDER BY s.created_at DESC`,
      [userId],
    );
  }

  async getOne(seriesId: number, userId: number) {
    const series = await this.db.queryOne(
      `SELECT
        s.series_id AS id,
        s.title,
        s.publication_frequency AS frequency,
        s.series_status AS status,
        (SELECT COUNT(*) FROM \`Chapter\` c WHERE c.series_id = s.series_id) AS chapters,
        GROUP_CONCAT(g.genre_name SEPARATOR ',') AS genres
       FROM \`Series\` s
       LEFT JOIN \`Series_Genre\` sg ON sg.series_id = s.series_id
       LEFT JOIN \`Genre\` g ON g.genre_id = sg.genre_id
       WHERE s.series_id = ? AND s.mangaka_user_id = ?
       GROUP BY s.series_id`,
      [seriesId, userId],
    );

    if (!series) {
      throw new NotFoundException('Series not found');
    }

    return series;
  }

  async listAll() {
    return this.db.query(
      `SELECT
        s.series_id AS id,
        s.title,
        s.publication_frequency AS frequency,
        s.series_status AS status,
        s.mangaka_user_id AS mangakaUserId,
        (SELECT full_name FROM \`User\` u WHERE u.user_id = s.mangaka_user_id) AS mangaka,
        (SELECT COUNT(*) FROM \`Chapter\` c WHERE c.series_id = s.series_id) AS chapters,
        ste.editor_user_id AS editorUserId,
        (SELECT full_name FROM \`User\` e WHERE e.user_id = ste.editor_user_id) AS editor
       FROM \`Series\` s
       LEFT JOIN \`Series_Tantou_Editor\` ste ON ste.series_id = s.series_id AND ste.unassigned_at IS NULL
       ORDER BY s.created_at DESC`,
      [],
    );
  }

  async getDefenseDossier(seriesId: number, userId: number, role: Role) {
    const series =
      role === Role.EDITORIAL_BOARD
        ? await this.assertBoardCanReadDossier(seriesId)
        : await this.assertActiveEditorForSeries(seriesId, userId, true);

    const [
      rankingHistory,
      publicationStatsRow,
      taskStatsRow,
      decisions,
      defenseReports,
    ] = await Promise.all([
      this.db.query(
        `SELECT
          r.reader_ranking_id AS id,
          r.rank_position AS rankPosition,
          r.reader_star_avg AS totalScore,
          r.reader_star_avg AS readerStarAvg,
          r.risk_level AS riskLevel,
          r.ranking_period_type AS periodType,
          r.period_start_date AS periodStartDate,
          r.period_end_date AS periodEndDate,
          r.calculated_at AS calculatedAt
         FROM \`Reader_Vote_Ranking\` r
         WHERE r.series_id = ?
         ORDER BY r.period_end_date ASC, r.calculated_at ASC`,
        [seriesId],
      ),
      this.db.queryOne<{
        publishedChapters: number;
        scheduledPublishedChapters: number;
        onTimeChapters: number;
        lateChapters: number;
      }>(
        `SELECT
          COUNT(DISTINCT CASE WHEN c.chapter_status = 'PUBLISHED' THEN c.chapter_id END) AS publishedChapters,
          COUNT(DISTINCT CASE WHEN ps.publish_status = 'PUBLISHED' AND ps.published_at IS NOT NULL THEN c.chapter_id END) AS scheduledPublishedChapters,
          COUNT(DISTINCT CASE WHEN ps.publish_status = 'PUBLISHED' AND ps.published_at <= ps.release_date THEN c.chapter_id END) AS onTimeChapters,
          COUNT(DISTINCT CASE WHEN ps.publish_status = 'PUBLISHED' AND ps.published_at > ps.release_date THEN c.chapter_id END) AS lateChapters
         FROM \`Chapter\` c
         LEFT JOIN \`Publication_Schedule\` ps ON ps.chapter_id = c.chapter_id
         WHERE c.series_id = ?`,
        [seriesId],
      ),
      this.db.queryOne<{
        totalTasks: number;
        approvedTasks: number;
        approvedOnTimeTasks: number;
        revisionRequiredCount: number;
      }>(
        `SELECT
          (SELECT COUNT(*)
           FROM \`Task\` t
           JOIN \`Page\` p ON p.page_id = t.page_id
           JOIN \`Chapter\` c ON c.chapter_id = p.chapter_id
           WHERE c.series_id = ?) AS totalTasks,
          (SELECT COUNT(*)
           FROM \`Task\` t
           JOIN \`Page\` p ON p.page_id = t.page_id
           JOIN \`Chapter\` c ON c.chapter_id = p.chapter_id
           WHERE c.series_id = ? AND t.task_status = 'APPROVED') AS approvedTasks,
          (SELECT COUNT(*)
           FROM \`Task\` t
           JOIN \`Page\` p ON p.page_id = t.page_id
           JOIN \`Chapter\` c ON c.chapter_id = p.chapter_id
           LEFT JOIN (
             SELECT task_id, MIN(submitted_at) AS approvedSubmittedAt
             FROM \`Submission\`
             WHERE submission_status = 'APPROVED'
             GROUP BY task_id
           ) approved_sub ON approved_sub.task_id = t.task_id
           WHERE c.series_id = ?
             AND t.task_status = 'APPROVED'
             AND (t.deadline IS NULL OR approved_sub.approvedSubmittedAt <= t.deadline)) AS approvedOnTimeTasks,
          (SELECT COUNT(*)
           FROM \`Submission\` sub
           JOIN \`Task\` t ON t.task_id = sub.task_id
           JOIN \`Page\` p ON p.page_id = t.page_id
           JOIN \`Chapter\` c ON c.chapter_id = p.chapter_id
           WHERE c.series_id = ? AND sub.submission_status = 'REVISION_REQUIRED') AS revisionRequiredCount`,
        [seriesId, seriesId, seriesId, seriesId],
      ),
      this.db.query(
        `SELECT
          d.decision_id AS id,
          d.decision_type AS type,
          d.new_frequency AS newFrequency,
          d.reason,
          d.decided_at AS decidedAt,
          u.full_name AS decidedBy
         FROM \`Decision\` d
         LEFT JOIN \`User\` u ON u.user_id = d.decided_by_user_id
         WHERE d.series_id = ?
         ORDER BY d.decided_at DESC`,
        [seriesId],
      ),
      this.listDefenseReports(seriesId),
    ]);

    const publicationStats = {
      publishedChapters: Number(publicationStatsRow?.publishedChapters ?? 0),
      scheduledPublishedChapters: Number(
        publicationStatsRow?.scheduledPublishedChapters ?? 0,
      ),
      onTimeChapters: Number(publicationStatsRow?.onTimeChapters ?? 0),
      lateChapters: Number(publicationStatsRow?.lateChapters ?? 0),
      onTimeRate: 0,
    };
    publicationStats.onTimeRate =
      publicationStats.scheduledPublishedChapters > 0
        ? Math.round(
            (publicationStats.onTimeChapters /
              publicationStats.scheduledPublishedChapters) *
              100,
          )
        : 0;

    const taskStats = {
      totalTasks: Number(taskStatsRow?.totalTasks ?? 0),
      approvedTasks: Number(taskStatsRow?.approvedTasks ?? 0),
      approvedOnTimeTasks: Number(taskStatsRow?.approvedOnTimeTasks ?? 0),
      revisionRequiredCount: Number(taskStatsRow?.revisionRequiredCount ?? 0),
      approvedOnTimeRate: 0,
      averageRevisionsPerTask: 0,
    };
    taskStats.approvedOnTimeRate =
      taskStats.approvedTasks > 0
        ? Math.round((taskStats.approvedOnTimeTasks / taskStats.approvedTasks) * 100)
        : 0;
    taskStats.averageRevisionsPerTask =
      taskStats.totalTasks > 0
        ? Number((taskStats.revisionRequiredCount / taskStats.totalTasks).toFixed(2))
        : 0;

    return {
      series,
      rankingHistory,
      publicationStats,
      taskStats,
      decisions,
      defenseReports,
    };
  }

  async createDefenseReport(
    seriesId: number,
    editorUserId: number,
    dto: CreateDefenseReportDto,
  ) {
    const series = await this.assertActiveEditorForSeries(
      seriesId,
      editorUserId,
      true,
    );

    const content = dto.content.trim();
    if (!content) {
      throw new BadRequestException('Nội dung báo cáo không được để trống');
    }

    const annotationId = await this.db.insert(
      `INSERT INTO \`Annotation\` (target_type, target_id, created_by_user_id, annotation_category, context)
       VALUES (?, ?, ?, ?, ?)`,
      [
        AnnotationTargetType.SERIES,
        seriesId,
        editorUserId,
        AnnotationCategory.GENERAL,
        content,
      ],
    );

    await this.db.query(
      `INSERT INTO \`Audit_Log\` (actor_user_id, action, entity_type, entity_id, after_value)
       VALUES (?, 'CREATE', 'Annotation', ?, ?)`,
      [
        editorUserId,
        annotationId,
        JSON.stringify({
          targetType: AnnotationTargetType.SERIES,
          targetId: seriesId,
          category: AnnotationCategory.GENERAL,
          context: content,
        }),
      ],
    );

    const boardUsers = await this.db.query<{ user_id: number }>(
      `SELECT user_id FROM \`User\`
       WHERE role = ? AND is_activated = 1`,
      [Role.EDITORIAL_BOARD],
    );

    for (const board of boardUsers) {
      await this.notifications.notify(
        board.user_id,
        NotificationType.GENERAL,
        `Tantou đã gửi báo cáo bảo vệ cho "${series.title}"`,
        content,
        'Series',
        seriesId,
      );
    }

    return this.findDefenseReport(annotationId);
  }

  async assignEditor(seriesId: number, editorUserId: number) {
    const series = await this.db.queryOne<{ title: string; mangaka_user_id: number }>(
      `SELECT title, mangaka_user_id FROM \`Series\` WHERE series_id = ?`,
      [seriesId],
    );

    if (!series) {
      throw new NotFoundException('Series not found');
    }

    await this.db.query(
      `UPDATE \`Series_Tantou_Editor\` SET unassigned_at = NOW() WHERE series_id = ? AND unassigned_at IS NULL`,
      [seriesId],
    );

    await this.db.query(
      `INSERT INTO \`Series_Tantou_Editor\` (series_id, editor_user_id) VALUES (?, ?)`,
      [seriesId, editorUserId],
    );

    // Notify the editor
    await this.notifications.notify(
      editorUserId,
      NotificationType.GENERAL,
      'Bạn được phân công biên tập',
      `Series "${series.title}"`,
      'Series',
      seriesId,
    );

    // Notify the mangaka
    await this.notifications.notify(
      series.mangaka_user_id,
      NotificationType.GENERAL,
      `Series "${series.title}" đã được giao cho biên tập`,
      'Series của bạn đã được giao cho một biên tập viên.',
      'Series',
      seriesId,
    );

    return { ok: true };
  }

  async unassignEditor(seriesId: number) {
    await this.db.query(
      `UPDATE \`Series_Tantou_Editor\` SET unassigned_at = NOW() WHERE series_id = ? AND unassigned_at IS NULL`,
      [seriesId],
    );

    return { ok: true };
  }

  private async assertActiveEditorForSeries(
    seriesId: number,
    editorUserId: number,
    requireCancelled = false,
  ) {
    const series = await this.db.queryOne<{
      id: number;
      title: string;
      status: SeriesStatus;
      frequency: string;
    }>(
      `SELECT
        s.series_id AS id,
        s.title,
        s.series_status AS status,
        s.publication_frequency AS frequency
       FROM \`Series\` s
       JOIN \`Series_Tantou_Editor\` ste
         ON ste.series_id = s.series_id AND ste.unassigned_at IS NULL
       WHERE s.series_id = ? AND ste.editor_user_id = ?`,
      [seriesId, editorUserId],
    );

    if (!series) {
      throw new ForbiddenException(
        'Bạn không phải Tantou Editor đang phụ trách series này',
      );
    }

    if (requireCancelled && series.status !== SeriesStatus.CANCELLED) {
      throw new BadRequestException(
        'Chỉ series đã bị Hội đồng hủy mới có hồ sơ bảo vệ',
      );
    }

    return series;
  }

  private async assertBoardCanReadDossier(seriesId: number) {
    const series = await this.db.queryOne<{
      id: number;
      title: string;
      status: SeriesStatus;
      frequency: string;
    }>(
      `SELECT
        s.series_id AS id,
        s.title,
        s.series_status AS status,
        s.publication_frequency AS frequency
       FROM \`Series\` s
       WHERE s.series_id = ?`,
      [seriesId],
    );

    if (!series) {
      throw new NotFoundException('Series not found');
    }

    if (series.status !== SeriesStatus.CANCELLED) {
      throw new BadRequestException(
        'Chỉ series đã bị Hội đồng hủy mới có hồ sơ bảo vệ',
      );
    }

    return series;
  }

  private async listDefenseReports(seriesId: number) {
    return this.db.query(
      `SELECT
        a.annotation_id AS id,
        a.context AS content,
        a.created_at AS createdAt,
        a.created_by_user_id AS authorId,
        u.full_name AS authorName
       FROM \`Annotation\` a
       LEFT JOIN \`User\` u ON u.user_id = a.created_by_user_id
       WHERE a.target_type = ?
         AND a.target_id = ?
         AND a.annotation_category = ?
       ORDER BY a.created_at DESC, a.annotation_id DESC`,
      [AnnotationTargetType.SERIES, seriesId, AnnotationCategory.GENERAL],
    );
  }

  private async findDefenseReport(annotationId: number) {
    return this.db.queryOne(
      `SELECT
        a.annotation_id AS id,
        a.context AS content,
        a.created_at AS createdAt,
        a.created_by_user_id AS authorId,
        u.full_name AS authorName
       FROM \`Annotation\` a
       LEFT JOIN \`User\` u ON u.user_id = a.created_by_user_id
       WHERE a.annotation_id = ?`,
      [annotationId],
    );
  }

  private async ensureSeriesAnnotationTargetType() {
    await this.db.query(
      `ALTER TABLE \`Annotation\`
       MODIFY \`target_type\` ENUM('PAGE','MANUSCRIPT','SUBMISSION','SERIES') NOT NULL`,
    );
  }
}

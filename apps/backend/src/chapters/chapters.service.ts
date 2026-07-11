import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  ChapterStatus,
  CHAPTER_TRANSITIONS,
  canTransition,
  NotificationType,
} from '@manga/shared';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { toMysqlDeadline } from '../common/date.util';

@Injectable()
export class ChaptersService {
  constructor(
    private readonly db: DbService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(userId: number, dto: CreateChapterDto) {
    // Verify ownership of series
    const series = await this.db.queryOne(
      `SELECT series_id FROM \`Series\` WHERE series_id = ? AND mangaka_user_id = ?`,
      [dto.seriesId, userId],
    );

    if (!series) {
      throw new ForbiddenException('You do not own this series');
    }

    // Get next chapter number
    const result = await this.db.queryOne<{ nextNumber: number }>(
      `SELECT COALESCE(MAX(chapter_number), 0) + 1 AS nextNumber FROM \`Chapter\` WHERE series_id = ?`,
      [dto.seriesId],
    );

    const chapterNumber = result?.nextNumber || 1;

    // Create chapter

    const deadline = dto.deadline ? toMysqlDeadline(dto.deadline) : null;

    if (dto.deadline && !deadline) {
      throw new BadRequestException('Hạn chót không hợp lệ');
    }
    const chapterId = await this.db.insert(
      `INSERT INTO \`Chapter\` (series_id, chapter_number, chapter_title, deadline, chapter_status)
       VALUES (?, ?, ?, ?, ?)`,
      [
        dto.seriesId,
        chapterNumber,
        dto.title.trim(),
        deadline,
        ChapterStatus.DRAFT,
      ],
    );

    return this.findOne(chapterId);
  }

  async listBySeries(seriesId: number, userId: number) {
    // Verify ownership of series
    const series = await this.db.queryOne(
      `SELECT series_id FROM \`Series\` WHERE series_id = ? AND mangaka_user_id = ?`,
      [seriesId, userId],
    );

    if (!series) {
      throw new ForbiddenException('You do not own this series');
    }

    return this.db.query(
      `SELECT
        c.chapter_id AS id,
        c.chapter_number AS number,
        c.chapter_title AS title,
        c.chapter_status AS status,
        c.deadline,
        (SELECT COUNT(DISTINCT p.page_id)
         FROM \`Page\` p
         JOIN \`Page_Version\` pv ON pv.page_id = p.page_id AND pv.version_number = p.current_version
         WHERE p.chapter_id = c.chapter_id) AS pages
       FROM \`Chapter\` c
       WHERE c.series_id = ?
       ORDER BY c.chapter_number`,
      [seriesId],
    );
  }

  async setStatus(chapterId: number, userId: number, status: ChapterStatus) {
    const chapter = await this.db.queryOne<{
      chapter_id: number;
      chapter_status: ChapterStatus;
      series_id: number;
      chapter_title: string;
      mangaka_user_id: number;
    }>(
      `SELECT c.chapter_id, c.chapter_status, c.series_id, c.chapter_title, s.mangaka_user_id
       FROM \`Chapter\` c
       JOIN \`Series\` s ON c.series_id = s.series_id
       WHERE c.chapter_id = ? AND s.mangaka_user_id = ?`,
      [chapterId, userId],
    );

    if (!chapter) {
      throw new NotFoundException('Chapter not found');
    }

    if (!canTransition(CHAPTER_TRANSITIONS, chapter.chapter_status, status)) {
      throw new BadRequestException(
        `Invalid chapter transition ${chapter.chapter_status} → ${status}`,
      );
    }

    // For PUBLISHED status, verify all pages are COMPLETED
    if (status === ChapterStatus.PUBLISHED) {
      const readiness = await this.getChapterReadiness(chapterId);

      if (readiness.totalPages === 0) {
        throw new BadRequestException('Chương chưa có trang');
      }

      if (readiness.incompletePages > 0) {
        throw new BadRequestException(
          'Còn trang chưa hoàn thành — không thể xuất bản',
        );
      }

      if (readiness.nonApprovedTasks > 0) {
        throw new BadRequestException(
          'Còn task chưa được duyệt — không thể xuất bản',
        );
      }
    }

    // Execute DB writes in transaction for PUBLISHED status, direct update otherwise
    if (status === ChapterStatus.PUBLISHED) {
      await this.db.transaction(async (tx) => {
        await tx.query(
          `UPDATE \`Chapter\` SET chapter_status = ? WHERE chapter_id = ?`,
          [status, chapterId],
        );

        await tx.query(
          `INSERT INTO \`Publication_Schedule\` (chapter_id, release_date, publish_status, scheduled_by_user_id, published_at)
           VALUES (?, NOW(), 'PUBLISHED', ?, NOW())
           ON DUPLICATE KEY UPDATE publish_status='PUBLISHED', published_at=NOW()`,
          [chapterId, userId],
        );
      });
    } else {
      await this.db.query(
        `UPDATE \`Chapter\` SET chapter_status = ? WHERE chapter_id = ?`,
        [status, chapterId],
      );
    }

    // Send notifications after transaction commits
    if (status === ChapterStatus.READY_FOR_EDITOR_REVIEW) {
      // Notify active assigned editors of this series
      const editors = await this.db.query<{ editor_user_id: number }>(
        `SELECT editor_user_id FROM \`Series_Tantou_Editor\` WHERE series_id = ? AND unassigned_at IS NULL`,
        [chapter.series_id],
      );

      for (const editor of editors) {
        await this.notifications.notify(
          editor.editor_user_id,
          NotificationType.REVIEW,
          `Chương "${chapter.chapter_title}" chờ duyệt`,
          'Một chương mới chờ duyệt của bạn.',
          'Chapter',
          chapterId,
        );
      }
    } else if (status === ChapterStatus.PUBLISHED) {
      // Notify mangaka (confirmation)
      await this.notifications.notify(
        chapter.mangaka_user_id,
        NotificationType.GENERAL,
        `Chương "${chapter.chapter_title}" đã xuất bản`,
        'Chương của bạn đã được xuất bản thành công.',
        'Chapter',
        chapterId,
      );

      // Notify active assigned editors
      const editors = await this.db.query<{ editor_user_id: number }>(
        `SELECT editor_user_id FROM \`Series_Tantou_Editor\` WHERE series_id = ? AND unassigned_at IS NULL`,
        [chapter.series_id],
      );

      for (const editor of editors) {
        await this.notifications.notify(
          editor.editor_user_id,
          NotificationType.GENERAL,
          `Chương "${chapter.chapter_title}" đã xuất bản`,
          'Một chương đã được xuất bản.',
          'Chapter',
          chapterId,
        );
      }
    }

    return this.findOne(chapterId);
  }

  async reviewQueue(editorId: number) {
    return this.db.query(
      `SELECT c.chapter_id AS id, c.chapter_number AS number, c.chapter_title AS title,
              c.chapter_status AS status, c.deadline, s.series_id AS seriesId, s.title AS series,
              (SELECT COUNT(DISTINCT p.page_id)
               FROM \`Page\` p
               JOIN \`Page_Version\` pv ON pv.page_id = p.page_id AND pv.version_number = p.current_version
               WHERE p.chapter_id = c.chapter_id) AS pages
       FROM \`Chapter\` c
       JOIN \`Series\` s ON s.series_id = c.series_id
       JOIN \`Series_Tantou_Editor\` ste ON ste.series_id = s.series_id
       WHERE ste.editor_user_id = ? AND ste.unassigned_at IS NULL
         AND c.chapter_status = 'READY_FOR_EDITOR_REVIEW'
       ORDER BY c.deadline ASC`,
      [editorId],
    );
  }

  async editorReview(
    chapterId: number,
    editorId: number,
    decision: 'APPROVE' | 'REVISE',
    feedback?: string,
  ) {
    const row = await this.db.queryOne<{
      chapter_id: number;
      chapter_status: ChapterStatus;
      series_id: number;
      mangaka_user_id: number;
      title: string;
    }>(
      `SELECT c.chapter_id, c.chapter_status, c.series_id, c.chapter_title AS title, s.mangaka_user_id
       FROM \`Chapter\` c
       JOIN \`Series\` s ON s.series_id = c.series_id
       JOIN \`Series_Tantou_Editor\` ste ON ste.series_id = s.series_id AND ste.unassigned_at IS NULL
       WHERE c.chapter_id = ? AND ste.editor_user_id = ?`,
      [chapterId, editorId],
    );

    if (!row) {
      throw new ForbiddenException(
        'You are not the assigned editor for this chapter',
      );
    }

    const target =
      decision === 'APPROVE'
        ? ChapterStatus.EDITOR_APPROVED
        : ChapterStatus.IN_PROGRESS;

    if (!canTransition(CHAPTER_TRANSITIONS, row.chapter_status, target)) {
      throw new BadRequestException(
        `Invalid transition ${row.chapter_status} → ${target}`,
      );
    }

    if (target === ChapterStatus.EDITOR_APPROVED) {
      const readiness = await this.getChapterReadiness(chapterId);

      if (readiness.totalPages === 0) {
        throw new BadRequestException(
          'Chương chưa có trang — không thể duyệt chương',
        );
      }

      if (readiness.incompletePages > 0 || readiness.nonApprovedTasks > 0) {
        const reasons: string[] = [];
        if (readiness.incompletePages > 0) {
          reasons.push(`${readiness.incompletePages} trang chưa hoàn thành`);
        }
        if (readiness.nonApprovedTasks > 0) {
          reasons.push(`${readiness.nonApprovedTasks} task chưa được duyệt`);
        }
        throw new BadRequestException(
          `Còn ${reasons.join(' và ')} — không thể duyệt chương`,
        );
      }
    }

    await this.db.query(
      `UPDATE \`Chapter\` SET chapter_status = ? WHERE chapter_id = ?`,
      [target, chapterId],
    );

    await this.notifications.notify(
      row.mangaka_user_id,
      NotificationType.REVIEW,
      decision === 'APPROVE'
        ? `Chương "${row.title}" đã được duyệt`
        : `Chương "${row.title}" cần chỉnh sửa`,
      feedback ?? '',
      'Chapter',
      chapterId,
    );

    return this.findOne(chapterId);
  }

  async editorPages(chapterId: number, editorId: number) {
    // Verify the caller is the ACTIVE assigned editor of the chapter's series
    const ok = await this.db.queryOne(
      `SELECT c.chapter_id FROM \`Chapter\` c
       JOIN \`Series_Tantou_Editor\` ste ON ste.series_id=c.series_id AND ste.unassigned_at IS NULL
       WHERE c.chapter_id=? AND ste.editor_user_id=?`,
      [chapterId, editorId],
    );

    if (!ok) {
      throw new ForbiddenException(
        'Bạn không phải biên tập phụ trách chương này',
      );
    }

    // Return pages with current version details
    return this.db.query(
      `SELECT p.page_id AS id, p.page_number AS number, p.page_status AS status, pv.image_url AS imageUrl
       FROM \`Page\` p
       JOIN \`Page_Version\` pv ON pv.page_id=p.page_id AND pv.version_number=p.current_version
       WHERE p.chapter_id=? ORDER BY p.page_number`,
      [chapterId],
    );
  }

  async boardReviewQueue() {
    return this.db.query(
      `SELECT
       c.chapter_id AS id,
       c.chapter_number AS number,
       c.chapter_title AS title,
       c.chapter_status AS status,
       c.deadline AS submittedAt,
       s.series_id AS seriesId,
       s.title AS series
     FROM \`Chapter\` c
     JOIN \`Series\` s ON s.series_id = c.series_id
     WHERE c.chapter_status = ?
     ORDER BY c.deadline ASC, c.chapter_id ASC`,
      [ChapterStatus.EDITOR_APPROVED],
    );
  }

  async boardReviewStatus(chapterId: number) {
    if (!Number.isInteger(chapterId) || chapterId <= 0) {
      throw new BadRequestException('Chapter ID không hợp lệ');
    }

    const chapter = await this.db.queryOne<{
      chapterId: number;
      chapterNumber: number;
      chapterTitle: string;
      status: ChapterStatus;
      seriesId: number;
      seriesTitle: string;
      hasActiveSchedule: number;
    }>(
      `SELECT
       c.chapter_id AS chapterId,
       c.chapter_number AS chapterNumber,
       c.chapter_title AS chapterTitle,
       c.chapter_status AS status,
       s.series_id AS seriesId,
       s.title AS seriesTitle,
       EXISTS(
         SELECT 1
         FROM \`Publication_Schedule\` ps
         WHERE ps.chapter_id = c.chapter_id
           AND ps.publish_status <> 'CANCELLED'
       ) AS hasActiveSchedule
     FROM \`Chapter\` c
     JOIN \`Series\` s
       ON s.series_id = c.series_id
     WHERE c.chapter_id = ?`,
      [chapterId],
    );

    if (!chapter) {
      throw new NotFoundException('Không tìm thấy chương');
    }

    const hasActiveSchedule = Number(chapter.hasActiveSchedule) === 1;

    const canBoardReview = chapter.status === ChapterStatus.EDITOR_APPROVED;

    const canSchedule =
      chapter.status === ChapterStatus.BOARD_APPROVED && !hasActiveSchedule;

    let message = `Trạng thái hiện tại: ${chapter.status}`;

    if (canBoardReview) {
      message = 'Chương đang chờ Hội đồng phê duyệt';
    } else if (chapter.status === ChapterStatus.BOARD_APPROVED) {
      message = hasActiveSchedule
        ? 'Chương đã được Hội đồng duyệt và đã có lịch xuất bản'
        : 'Chương đã được Hội đồng duyệt và có thể lên lịch xuất bản';
    }

    return {
      chapterId: chapter.chapterId,
      chapterNumber: chapter.chapterNumber,
      chapterTitle: chapter.chapterTitle,
      seriesId: chapter.seriesId,
      seriesTitle: chapter.seriesTitle,
      status: chapter.status,
      hasActiveSchedule,
      canBoardReview,
      canSchedule,
      message,
    };
  }

  async boardReview(
    chapterId: number,
    boardUserId: number,
    decision: 'APPROVE' | 'REJECT',
    feedback?: string,
  ) {
    const chapter = await this.db.queryOne<{
      chapter_id: number;
      chapter_status: ChapterStatus;
      chapter_title: string;
      mangaka_user_id: number;
    }>(
      `SELECT
       c.chapter_id,
       c.chapter_status,
       c.chapter_title,
       s.mangaka_user_id
     FROM \`Chapter\` c
     JOIN \`Series\` s ON s.series_id = c.series_id
     WHERE c.chapter_id = ?`,
      [chapterId],
    );

    if (!chapter) {
      throw new NotFoundException('Không tìm thấy chương');
    }

    if (chapter.chapter_status !== ChapterStatus.EDITOR_APPROVED) {
      throw new BadRequestException(
        'Chỉ có thể xét duyệt chương đã được biên tập viên duyệt',
      );
    }

    const target =
      decision === 'APPROVE'
        ? ChapterStatus.BOARD_APPROVED
        : ChapterStatus.IN_PROGRESS;

    await this.db.query(
      `UPDATE \`Chapter\`
     SET chapter_status = ?
     WHERE chapter_id = ?`,
      [target, chapterId],
    );

    await this.notifications.notify(
      chapter.mangaka_user_id,
      NotificationType.DECISION,
      decision === 'APPROVE'
        ? `Hội đồng đã chấp nhận chương "${chapter.chapter_title}"`
        : `Hội đồng từ chối chương "${chapter.chapter_title}"`,
      feedback ?? '',
      'Chapter',
      chapterId,
    );

    return {
      id: chapterId,
      status: target,
      reviewedBy: boardUserId,
    };
  }

  private async findOne(chapterId: number) {
    return this.db.queryOne(
      `SELECT
        c.chapter_id AS id,
        c.chapter_number AS number,
        c.chapter_title AS title,
        c.chapter_status AS status,
        c.deadline,
        c.is_locked AS isLocked,
        (SELECT COUNT(DISTINCT p.page_id)
         FROM \`Page\` p
         JOIN \`Page_Version\` pv ON pv.page_id = p.page_id AND pv.version_number = p.current_version
         WHERE p.chapter_id = c.chapter_id) AS pages
       FROM \`Chapter\` c
       WHERE c.chapter_id = ?`,
      [chapterId],
    );
  }

  private async getChapterReadiness(chapterId: number) {
    const row = await this.db.queryOne<{
      totalPages: number;
      incompletePages: number;
      nonApprovedTasks: number;
    }>(
      `SELECT
    (SELECT COUNT(*)
     FROM \`Page\` p
     WHERE p.chapter_id = ?) AS totalPages,

    (SELECT COUNT(*)
     FROM \`Page\` p
     WHERE p.chapter_id = ?
       AND (
         p.page_status <> 'COMPLETED'
         OR NOT EXISTS (
           SELECT 1
           FROM \`Page_Version\` pv
           WHERE pv.page_id = p.page_id
             AND pv.version_number = p.current_version
         )
       )) AS incompletePages,

    (SELECT COUNT(DISTINCT t.task_id)
     FROM \`Task\` t
     JOIN \`Page\` p ON p.page_id = t.page_id
     WHERE p.chapter_id = ?
       AND t.task_status <> 'APPROVED') AS nonApprovedTasks`,
      [chapterId, chapterId, chapterId],
    );

    return {
      totalPages: Number(row?.totalPages ?? 0),
      incompletePages: Number(row?.incompletePages ?? 0),
      nonApprovedTasks: Number(row?.nonApprovedTasks ?? 0),
    };
  }
}

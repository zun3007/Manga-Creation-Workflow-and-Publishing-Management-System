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
    const chapterId = await this.db.insert(
      `INSERT INTO \`Chapter\` (series_id, chapter_number, chapter_title, deadline, chapter_status)
       VALUES (?, ?, ?, ?, ?)`,
      [
        dto.seriesId,
        chapterNumber,
        dto.title,
        dto.deadline ?? null,
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
        (SELECT COUNT(*) FROM \`Page\` p WHERE p.chapter_id = c.chapter_id) AS pages
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
    }>(
      `SELECT c.chapter_id, c.chapter_status, c.series_id
       FROM \`Chapter\` c
       JOIN \`Series\` s ON c.series_id = s.series_id
       WHERE c.chapter_id = ? AND s.mangaka_user_id = ?`,
      [chapterId, userId],
    );

    if (!chapter) {
      throw new NotFoundException('Chapter not found');
    }

    if (
      !canTransition(CHAPTER_TRANSITIONS, chapter.chapter_status, status)
    ) {
      throw new BadRequestException(
        `Invalid chapter transition ${chapter.chapter_status} → ${status}`,
      );
    }

    await this.db.query(`UPDATE \`Chapter\` SET chapter_status = ? WHERE chapter_id = ?`, [
      status,
      chapterId,
    ]);

    return this.findOne(chapterId);
  }

  async reviewQueue(editorId: number) {
    return this.db.query(
      `SELECT c.chapter_id AS id, c.chapter_number AS number, c.chapter_title AS title,
              c.chapter_status AS status, c.deadline, s.series_id AS seriesId, s.title AS series,
              (SELECT COUNT(*) FROM \`Page\` p WHERE p.chapter_id = c.chapter_id) AS pages
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

  private async findOne(chapterId: number) {
    return this.db.queryOne(
      `SELECT
        c.chapter_id AS id,
        c.chapter_number AS number,
        c.chapter_title AS title,
        c.chapter_status AS status,
        c.deadline,
        c.is_locked AS isLocked,
        (SELECT COUNT(*) FROM \`Page\` p WHERE p.chapter_id = c.chapter_id) AS pages
       FROM \`Chapter\` c
       WHERE c.chapter_id = ?`,
      [chapterId],
    );
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ChapterStatus } from '@manga/shared';
import { DbService } from '../db/db.service';
import { toMysqlDeadline } from '../common/date.util';
import { CreatePublicationScheduleDto } from './dto/create-publication-schedule.dto';

@Injectable()
export class PublicationScheduleService {
  constructor(private readonly db: DbService) {}

  async create(boardUserId: number, dto: CreatePublicationScheduleDto) {
    const releaseDate = toMysqlDeadline(dto.releaseDate);
    if (!releaseDate) {
      throw new BadRequestException('Ngày phát hành không hợp lệ');
    }

    const chapter = await this.db.queryOne<{
      chapter_id: number;
      chapter_status: ChapterStatus;
    }>(`SELECT chapter_id, chapter_status FROM \`Chapter\` WHERE chapter_id = ?`, [
      dto.chapterId,
    ]);

    if (!chapter) {
      throw new NotFoundException('Chapter not found');
    }

    if (chapter.chapter_status !== ChapterStatus.EDITOR_APPROVED) {
      throw new BadRequestException(
        'Chỉ có thể tạo lịch cho chương đã được duyệt cuối',
      );
    }

    const id = await this.db.insert(
      `INSERT INTO \`Publication_Schedule\` (release_date, scheduled_by_user_id, chapter_id)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         schedule_id = LAST_INSERT_ID(schedule_id),
         release_date = VALUES(release_date),
         scheduled_by_user_id = VALUES(scheduled_by_user_id),
         publish_status = 'SCHEDULED',
         scheduled_at = CURRENT_TIMESTAMP,
         published_at = NULL`,
      [releaseDate, boardUserId, dto.chapterId],
    );

    return { id };
  }

  async list() {
    return this.db.query(
      `SELECT
         ps.schedule_id AS id,
         ps.chapter_id AS chapterId,
         c.chapter_number AS chapterNumber,
         c.chapter_title AS chapterTitle,
         s.series_id AS seriesId,
         s.title AS seriesTitle,
         DATE_FORMAT(ps.release_date, '%Y-%m-%d') AS releaseDate,
         ps.publish_status AS status
       FROM \`Publication_Schedule\` ps
       JOIN \`Chapter\` c ON c.chapter_id = ps.chapter_id
       JOIN \`Series\` s ON s.series_id = c.series_id
       ORDER BY ps.release_date ASC, ps.schedule_id DESC`,
    );
  }

  async eligibleChapters() {
    return this.db.query(
      `SELECT
         c.chapter_id AS id,
         c.chapter_number AS number,
         c.chapter_title AS title,
         s.series_id AS seriesId,
         s.title AS seriesTitle
       FROM \`Chapter\` c
       JOIN \`Series\` s ON s.series_id = c.series_id
       LEFT JOIN \`Publication_Schedule\` ps ON ps.chapter_id = c.chapter_id
        AND ps.publish_status <> 'CANCELLED'
       WHERE c.chapter_status = ?
         AND ps.schedule_id IS NULL
       ORDER BY s.title ASC, c.chapter_number ASC`,
      [ChapterStatus.EDITOR_APPROVED],
    );
  }

  async cancel(scheduleId: number) {
    const schedule = await this.db.queryOne<{
      schedule_id: number;
      publish_status: string;
    }>(
      `SELECT schedule_id, publish_status FROM \`Publication_Schedule\` WHERE schedule_id = ?`,
      [scheduleId],
    );

    if (!schedule) {
      throw new NotFoundException('Publication schedule not found');
    }

    if (schedule.publish_status !== 'SCHEDULED') {
      throw new BadRequestException('Chỉ có thể huỷ lịch đang chờ phát hành');
    }

    await this.db.query(
      `UPDATE \`Publication_Schedule\` SET publish_status='CANCELLED' WHERE schedule_id = ?`,
      [scheduleId],
    );

    return { ok: true };
  }
}

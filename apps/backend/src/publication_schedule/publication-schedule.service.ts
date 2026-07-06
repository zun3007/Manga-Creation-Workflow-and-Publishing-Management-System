import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ChapterStatus, SeriesStatus } from '@manga/shared';
import { DbService } from '../db/db.service';
import { toMysqlDeadline } from '../common/date.util';
import { CreatePublicationScheduleDto } from './dto/create-publication-schedule.dto';

@Injectable()
export class PublicationScheduleService {
  constructor(private readonly db: DbService) {}

  async create(boardUserId: number, dto: CreatePublicationScheduleDto) {
    const releaseDatePart = this.datePart(dto.releaseDate);
    const releaseDate = toMysqlDeadline(dto.releaseDate);
    if (!releaseDate) {
      throw new BadRequestException('Ngày phát hành không hợp lệ');
    }

    if (!releaseDatePart || releaseDatePart < this.todayDate()) {
      throw new BadRequestException(
        'Ngày phát hành không thể ở quá khứ',
      );
    }

    const chapter = await this.db.queryOne<{
      chapter_id: number;
      chapter_status: ChapterStatus;
      series_status: SeriesStatus;
    }>(
      `SELECT c.chapter_id, c.chapter_status, s.series_status
       FROM \`Chapter\` c
       JOIN \`Series\` s ON s.series_id = c.series_id
       WHERE c.chapter_id = ?`,
      [dto.chapterId],
    );

    if (!chapter) {
      throw new NotFoundException('Chapter not found');
    }

    if (chapter.chapter_status !== ChapterStatus.EDITOR_APPROVED) {
      throw new BadRequestException(
        'Chỉ có thể tạo lịch cho chương đã được duyệt cuối',
      );
    }

    if (
      chapter.series_status === SeriesStatus.CANCELLED ||
      chapter.series_status === SeriesStatus.HIATUS
    ) {
      throw new BadRequestException(
        'Không thể lên lịch cho series đã huỷ hoặc đang tạm dừng',
      );
    }

    const existing = await this.db.queryOne<{
      schedule_id: number;
      publish_status: 'SCHEDULED' | 'PUBLISHED' | 'CANCELLED';
    }>(
      `SELECT schedule_id, publish_status
       FROM \`Publication_Schedule\`
       WHERE chapter_id = ?
       LIMIT 1`,
      [dto.chapterId],
    );

    if (existing && existing.publish_status !== 'CANCELLED') {
      throw new BadRequestException(
        'Chương này đã có lịch phát hành đang hoạt động',
      );
    }

    if (existing?.publish_status === 'CANCELLED') {
      await this.db.query(
        `UPDATE \`Publication_Schedule\`
         SET release_date = ?,
             scheduled_by_user_id = ?,
             publish_status = 'SCHEDULED',
             scheduled_at = CURRENT_TIMESTAMP,
             published_at = NULL
         WHERE schedule_id = ?`,
        [releaseDate, boardUserId, existing.schedule_id],
      );
      return { id: existing.schedule_id };
    }

    const id = await this.db.insert(
      `INSERT INTO \`Publication_Schedule\` (release_date, scheduled_by_user_id, chapter_id)
       VALUES (?, ?, ?)`,
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
         ps.publish_status AS status,
         CASE
           WHEN ps.publish_status = 'SCHEDULED' AND DATE(ps.release_date) > CURRENT_DATE()
           THEN 1 ELSE 0
         END AS canCancel,
         CASE
           WHEN ps.publish_status = 'SCHEDULED' AND DATE(ps.release_date) <= CURRENT_DATE()
           THEN 1 ELSE 0
         END AS canPublish
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
         AND s.series_status NOT IN (?, ?)
         AND ps.schedule_id IS NULL
       ORDER BY s.title ASC, c.chapter_number ASC`,
      [ChapterStatus.EDITOR_APPROVED, SeriesStatus.CANCELLED, SeriesStatus.HIATUS],
    );
  }

  async cancel(scheduleId: number) {
    const schedule = await this.db.queryOne<{
      schedule_id: number;
      publish_status: string;
      release_date: string;
    }>(
      `SELECT schedule_id, publish_status, DATE_FORMAT(release_date, '%Y-%m-%d') AS release_date
       FROM \`Publication_Schedule\`
       WHERE schedule_id = ?`,
      [scheduleId],
    );

    if (!schedule) {
      throw new NotFoundException('Publication schedule not found');
    }

    if (schedule.publish_status !== 'SCHEDULED') {
      throw new BadRequestException('Chỉ có thể huỷ lịch đang chờ phát hành');
    }

    if (schedule.release_date <= this.todayDate()) {
      throw new BadRequestException(
        'Không thể huỷ lịch đã đến ngày phát hành',
      );
    }

    await this.db.query(
      `UPDATE \`Publication_Schedule\` SET publish_status='CANCELLED' WHERE schedule_id = ?`,
      [scheduleId],
    );

    return { ok: true };
  }

  async publish(scheduleId: number) {
    const schedule = await this.db.queryOne<{
      schedule_id: number;
      chapter_id: number;
      publish_status: string;
      release_date: string;
      chapter_status: ChapterStatus;
    }>(
      `SELECT
         ps.schedule_id,
         ps.chapter_id,
         ps.publish_status,
         DATE_FORMAT(ps.release_date, '%Y-%m-%d') AS release_date,
         c.chapter_status
       FROM \`Publication_Schedule\` ps
       JOIN \`Chapter\` c ON c.chapter_id = ps.chapter_id
       WHERE ps.schedule_id = ?`,
      [scheduleId],
    );

    if (!schedule) {
      throw new NotFoundException('Publication schedule not found');
    }

    if (schedule.publish_status !== 'SCHEDULED') {
      throw new BadRequestException('Chỉ có thể xuất bản lịch đang chờ');
    }

    if (schedule.release_date > this.todayDate()) {
      throw new BadRequestException('Chưa đến ngày phát hành');
    }

    if (schedule.chapter_status !== ChapterStatus.EDITOR_APPROVED) {
      throw new BadRequestException(
        'Chỉ có thể xuất bản chương đã được duyệt cuối',
      );
    }

    await this.db.transaction(async (tx) => {
      await tx.query(
        `UPDATE \`Chapter\`
         SET chapter_status = ?, is_locked = TRUE
         WHERE chapter_id = ?`,
        [ChapterStatus.PUBLISHED, schedule.chapter_id],
      );

      await tx.query(
        `UPDATE \`Publication_Schedule\`
         SET publish_status = 'PUBLISHED', published_at = CURRENT_TIMESTAMP
         WHERE schedule_id = ?`,
        [scheduleId],
      );
    });

    return { ok: true };
  }

  private datePart(value?: string | null): string | null {
    const date = String(value ?? '').slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
  }

  private todayDate(): string {
    return this.formatDate(new Date());
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

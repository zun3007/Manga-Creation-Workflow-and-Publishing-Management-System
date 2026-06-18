import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '@manga/shared';

@Injectable()
export class SeriesService {
  constructor(
    private readonly db: DbService,
    private readonly notifications: NotificationsService,
  ) {}

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
}

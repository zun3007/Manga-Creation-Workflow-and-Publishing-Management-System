import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DbService } from '../db/db.service';

@Injectable()
export class SeriesService {
  constructor(private readonly db: DbService) {}

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
}

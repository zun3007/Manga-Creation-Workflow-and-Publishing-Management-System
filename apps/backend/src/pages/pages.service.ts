import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
import { CreatePageDto } from './dto/create-page.dto';

@Injectable()
export class PagesService {
  constructor(private readonly db: DbService) {}

  async create(userId: number, dto: CreatePageDto) {
    // Verify ownership of chapter via series
    const chapter = await this.db.queryOne<{
      chapter_id: number;
      series_id: number;
    }>(
      `SELECT c.chapter_id, c.series_id
       FROM \`Chapter\` c
       JOIN \`Series\` s ON c.series_id = s.series_id
       WHERE c.chapter_id = ? AND s.mangaka_user_id = ?`,
      [dto.chapterId, userId],
    );

    if (!chapter) {
      throw new ForbiddenException('You do not own this chapter');
    }

    // Get next page number
    const result = await this.db.queryOne<{ nextNumber: number }>(
      `SELECT COALESCE(MAX(page_number), 0) + 1 AS nextNumber FROM \`Page\` WHERE chapter_id = ?`,
      [dto.chapterId],
    );

    const pageNumber = result?.nextNumber || 1;

    // Create page
    const pageId = await this.db.insert(
      `INSERT INTO \`Page\` (chapter_id, page_number, current_version, page_status)
       VALUES (?, ?, ?, ?)`,
      [dto.chapterId, pageNumber, 1, 'RAW'],
    );

    // Create initial page version
    await this.db.insert(
      `INSERT INTO \`Page_Version\` (page_id, version_number, image_url, uploaded_by_user_id, upload_note)
       VALUES (?, ?, ?, ?, ?)`,
      [pageId, 1, dto.imageUrl, userId, dto.uploadNote ?? null],
    );

    return this.findOne(pageId, userId);
  }

  async listByChapter(chapterId: number, userId: number) {
    // Verify ownership of chapter via series
    const chapter = await this.db.queryOne<{
      chapter_id: number;
      series_id: number;
    }>(
      `SELECT c.chapter_id, c.series_id
       FROM \`Chapter\` c
       JOIN \`Series\` s ON c.series_id = s.series_id
       WHERE c.chapter_id = ? AND s.mangaka_user_id = ?`,
      [chapterId, userId],
    );

    if (!chapter) {
      throw new ForbiddenException('You do not own this chapter');
    }

    return this.db.query(
      `SELECT
        p.page_id AS id,
        p.page_number AS number,
        p.page_status AS status,
        pv.image_url AS imageUrl
       FROM \`Page\` p
       JOIN \`Page_Version\` pv ON pv.page_id = p.page_id AND pv.version_number = p.current_version
       WHERE p.chapter_id = ?
       ORDER BY p.page_number`,
      [chapterId],
    );
  }

  async findOne(pageId: number, userId: number) {
    // Verify ownership
    const page = await this.db.queryOne<{
      page_id: number;
      chapter_id: number;
      page_number: number;
      page_status: string;
      page_version_id: number;
      image_url: string;
    }>(
      `SELECT
        p.page_id,
        p.chapter_id,
        p.page_number AS page_number,
        p.page_status,
        pv.page_version_id,
        pv.image_url
       FROM \`Page\` p
       JOIN \`Page_Version\` pv ON pv.page_id = p.page_id AND pv.version_number = p.current_version
       JOIN \`Chapter\` c ON p.chapter_id = c.chapter_id
       JOIN \`Series\` s ON c.series_id = s.series_id
       WHERE p.page_id = ? AND s.mangaka_user_id = ?`,
      [pageId, userId],
    );

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    // Get regions for this page
    const regions = await this.db.query(
      `SELECT
        region_id AS id,
        region_type AS type,
        x_coordinate AS x,
        y_coordinate AS y,
        width,
        height
       FROM \`Region\`
       WHERE page_id = ?`,
      [pageId],
    );

    return {
      id: page.page_id,
      number: page.page_number,
      status: page.page_status,
      imageUrl: page.image_url,
      pageVersionId: page.page_version_id,
      regions,
    };
  }
}

import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
import { CreateRegionDto } from './dto/create-region.dto';

@Injectable()
export class RegionsService {
  constructor(private readonly db: DbService) {}

  async create(userId: number, dto: CreateRegionDto) {
    // Verify ownership: page -> chapter -> series -> mangaka_user_id
    const page = await this.db.queryOne<{
      page_id: number;
    }>(
      `SELECT p.page_id
       FROM \`Page\` p
       JOIN \`Chapter\` c ON p.chapter_id = c.chapter_id
       JOIN \`Series\` s ON c.series_id = s.series_id
       WHERE p.page_id = ? AND s.mangaka_user_id = ?`,
      [dto.pageId, userId],
    );

    if (!page) {
      throw new ForbiddenException('You do not own this page');
    }

    // Get the page's current page_version_id
    const pageVersion = await this.db.queryOne<{
      page_version_id: number;
    }>(
      `SELECT pv.page_version_id
       FROM \`Page\` p
       JOIN \`Page_Version\` pv ON pv.page_id = p.page_id AND pv.version_number = p.current_version
       WHERE p.page_id = ?`,
      [dto.pageId],
    );

    if (!pageVersion) {
      throw new NotFoundException('Page version not found');
    }

    // Create region
    const regionId = await this.db.insert(
      `INSERT INTO \`Region\` (page_id, page_version_id, region_type, x_coordinate, y_coordinate, width, height)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        dto.pageId,
        pageVersion.page_version_id,
        dto.regionType,
        dto.x,
        dto.y,
        dto.width,
        dto.height,
      ],
    );

    return this.findOne(regionId, userId);
  }

  async listByPage(pageId: number, userId: number) {
    // Verify ownership
    const page = await this.db.queryOne<{
      page_id: number;
    }>(
      `SELECT p.page_id
       FROM \`Page\` p
       JOIN \`Chapter\` c ON p.chapter_id = c.chapter_id
       JOIN \`Series\` s ON c.series_id = s.series_id
       WHERE p.page_id = ? AND s.mangaka_user_id = ?`,
      [pageId, userId],
    );

    if (!page) {
      throw new ForbiddenException('You do not own this page');
    }

    return this.db.query(
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
  }

  async updateType(regionId: number, userId: number, regionType: string) {
    // Verify ownership via region -> page -> chapter -> series -> mangaka
    const region = await this.db.queryOne<{ region_id: number }>(
      `SELECT r.region_id
       FROM \`Region\` r
       JOIN \`Page\` p ON r.page_id = p.page_id
       JOIN \`Chapter\` c ON p.chapter_id = c.chapter_id
       JOIN \`Series\` s ON c.series_id = s.series_id
       WHERE r.region_id = ? AND s.mangaka_user_id = ?`,
      [regionId, userId],
    );

    if (!region) {
      throw new ForbiddenException('You do not own this region');
    }

    await this.db.query(
      `UPDATE \`Region\` SET region_type = ? WHERE region_id = ?`,
      [regionType, regionId],
    );

    return this.findOne(regionId, userId);
  }

  async delete(regionId: number, userId: number) {
    // Verify ownership: region -> page -> chapter -> series -> mangaka_user_id
    const region = await this.db.queryOne<{
      region_id: number;
    }>(
      `SELECT r.region_id
       FROM \`Region\` r
       JOIN \`Page\` p ON r.page_id = p.page_id
       JOIN \`Chapter\` c ON p.chapter_id = c.chapter_id
       JOIN \`Series\` s ON c.series_id = s.series_id
       WHERE r.region_id = ? AND s.mangaka_user_id = ?`,
      [regionId, userId],
    );

    if (!region) {
      throw new ForbiddenException('You do not own this region');
    }

    await this.db.query(`DELETE FROM \`Region\` WHERE region_id = ?`, [
      regionId,
    ]);

    return { deleted: true };
  }

  private async findOne(regionId: number, userId: number) {
    // Verify ownership and fetch
    const region = await this.db.queryOne<{
      region_id: number;
      region_type: string;
      x_coordinate: number;
      y_coordinate: number;
      width: number;
      height: number;
    }>(
      `SELECT
        r.region_id,
        r.region_type,
        r.x_coordinate,
        r.y_coordinate,
        r.width,
        r.height
       FROM \`Region\` r
       JOIN \`Page\` p ON r.page_id = p.page_id
       JOIN \`Chapter\` c ON p.chapter_id = c.chapter_id
       JOIN \`Series\` s ON c.series_id = s.series_id
       WHERE r.region_id = ? AND s.mangaka_user_id = ?`,
      [regionId, userId],
    );

    if (!region) {
      throw new NotFoundException('Region not found');
    }

    return {
      id: region.region_id,
      type: region.region_type,
      x: region.x_coordinate,
      y: region.y_coordinate,
      width: region.width,
      height: region.height,
    };
  }
}

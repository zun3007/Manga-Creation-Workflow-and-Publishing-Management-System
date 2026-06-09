import { Injectable, ForbiddenException, OnModuleInit } from '@nestjs/common';
import { DbService } from '../db/db.service';

@Injectable()
export class StudioService implements OnModuleInit {
  constructor(private readonly db: DbService) {}

  async onModuleInit() {
    // idempotent: ensures the table exists for already-initialized dev databases
    await this.db.query(
      `CREATE TABLE IF NOT EXISTS \`Studio_Document\` (
        \`page_id\` INT NOT NULL,
        \`manifest_json\` JSON NOT NULL,
        \`updated_by_user_id\` INT NULL,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`page_id\`)
      )`,
    );
  }

  private async assertOwnsPage(pageId: number, userId: number) {
    const page = await this.db.queryOne(
      `SELECT p.page_id FROM \`Page\` p
       JOIN \`Chapter\` c ON p.chapter_id = c.chapter_id
       JOIN \`Series\` s ON c.series_id = s.series_id
       WHERE p.page_id = ? AND s.mangaka_user_id = ?`,
      [pageId, userId],
    );
    if (!page) throw new ForbiddenException('You do not own this page');
  }

  async savePageVersion(userId: number, pageId: number, imageUrl: string, note?: string) {
    await this.assertOwnsPage(pageId, userId);
    const cur = await this.db.queryOne<{ current_version: number }>(
      `SELECT current_version FROM \`Page\` WHERE page_id = ?`, [pageId]);
    const next = (cur?.current_version ?? 0) + 1;
    await this.db.insert(
      `INSERT INTO \`Page_Version\` (page_id, version_number, image_url, uploaded_by_user_id, upload_note)
       VALUES (?, ?, ?, ?, ?)`, [pageId, next, imageUrl, userId, note ?? null]);
    await this.db.query(
      `UPDATE \`Page\` SET current_version = ?, page_status = 'IN_PROGRESS' WHERE page_id = ?`, [next, pageId]);
    return { pageId, versionNumber: next, imageUrl };
  }

  async saveDoc(userId: number, pageId: number, manifest: unknown) {
    await this.assertOwnsPage(pageId, userId);
    await this.db.query(
      `INSERT INTO \`Studio_Document\` (page_id, manifest_json, updated_by_user_id)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE manifest_json = VALUES(manifest_json), updated_by_user_id = VALUES(updated_by_user_id)`,
      [pageId, JSON.stringify(manifest), userId]);
    return { saved: true };
  }

  async getDoc(userId: number, pageId: number) {
    await this.assertOwnsPage(pageId, userId);
    const row = await this.db.queryOne<{ manifest_json: unknown }>(
      `SELECT manifest_json FROM \`Studio_Document\` WHERE page_id = ?`, [pageId]);
    if (!row) return null;
    return typeof row.manifest_json === 'string' ? JSON.parse(row.manifest_json) : row.manifest_json;
  }
}

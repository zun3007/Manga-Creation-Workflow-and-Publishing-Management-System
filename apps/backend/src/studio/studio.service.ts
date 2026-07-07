import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { ChapterStatus, Role, TaskStatus } from '@manga/shared';
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

  private assertChapterEditableForMangaka(status: string) {
    if (
      [
        ChapterStatus.READY_FOR_EDITOR_REVIEW,
        ChapterStatus.EDITOR_APPROVED,
        ChapterStatus.PUBLISHED,
      ].includes(status as ChapterStatus)
    ) {
      throw new BadRequestException(
        'Chapter đang chờ biên tập/đã duyệt/đã xuất bản nên không thể sửa Studio',
      );
    }
  }

  private async getPageAccess(pageId: number, userId: number) {
    const editableTaskStatuses = [
      TaskStatus.ASSIGNED,
      TaskStatus.IN_PROGRESS,
      TaskStatus.REVISION_REQUIRED,
    ];

    return this.db.queryOne<{
      page_id: number;
      mangaka_user_id: number;
      chapter_status: string;
      assistant_task_count: number;
      editable_assistant_task_count: number;
    }>(
      `SELECT
        p.page_id,
        s.mangaka_user_id,
        c.chapter_status,
        (
          SELECT COUNT(*) FROM \`Task\` t
          WHERE t.page_id = p.page_id AND t.assignee_user_id = ?
        ) AS assistant_task_count,
        (
          SELECT COUNT(*) FROM \`Task\` t
          WHERE t.page_id = p.page_id
            AND t.assignee_user_id = ?
            AND t.task_status IN (?, ?, ?)
        ) AS editable_assistant_task_count
       FROM \`Page\` p
       JOIN \`Chapter\` c ON p.chapter_id = c.chapter_id
       JOIN \`Series\` s ON c.series_id = s.series_id
       WHERE p.page_id = ?`,
      [
        userId,
        userId,
        ...editableTaskStatuses,
        pageId,
      ],
    );
  }

  private async assertCanReadPage(pageId: number, userId: number, role: Role) {
    const page = await this.getPageAccess(pageId, userId);
    if (!page) throw new ForbiddenException('Không tìm thấy trang');
    if (role === Role.MANGAKA && page.mangaka_user_id === userId) return page;
    if (role === Role.ASSISTANT && Number(page.assistant_task_count) > 0) {
      return page;
    }
    throw new ForbiddenException('Bạn không có quyền mở Studio của trang này');
  }

  private async assertCanWritePage(pageId: number, userId: number, role: Role) {
    const page = await this.assertCanReadPage(pageId, userId, role);
    if (role === Role.MANGAKA && page.mangaka_user_id === userId) {
      this.assertChapterEditableForMangaka(page.chapter_status);
      return;
    }
    if (role === Role.ASSISTANT && Number(page.editable_assistant_task_count) > 0) {
      return;
    }
    throw new BadRequestException(
      'Task đã nộp/đã duyệt nên không thể sửa Studio nữa',
    );
  }

  async savePageVersion(userId: number, role: Role, pageId: number, imageUrl: string, note?: string) {
    await this.assertCanWritePage(pageId, userId, role);
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

  async saveDoc(userId: number, role: Role, pageId: number, manifest: unknown) {
    await this.assertCanWritePage(pageId, userId, role);
    await this.db.query(
      `INSERT INTO \`Studio_Document\` (page_id, manifest_json, updated_by_user_id)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE manifest_json = VALUES(manifest_json), updated_by_user_id = VALUES(updated_by_user_id)`,
      [pageId, JSON.stringify(manifest), userId]);
    return { saved: true };
  }

  async getDoc(userId: number, role: Role, pageId: number) {
    await this.assertCanReadPage(pageId, userId, role);
    const row = await this.db.queryOne<{ manifest_json: unknown }>(
      `SELECT manifest_json FROM \`Studio_Document\` WHERE page_id = ?`, [pageId]);
    if (!row) return null;
    return typeof row.manifest_json === 'string' ? JSON.parse(row.manifest_json) : row.manifest_json;
  }
}

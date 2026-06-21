import { Injectable, ForbiddenException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { CreateAnnotationDto } from './dto/create-annotation.dto';

@Injectable()
export class AnnotationsService {
  constructor(private readonly db: DbService) {}

  /**
   * Authorize a user against an annotation target before reading/creating.
   * Without this, any editor/mangaka could read OR create annotations for ANY
   * target id (cross-series IDOR). For PAGE targets, access is granted only to
   * the series' mangaka or an actively-assigned tantou editor. Other target
   * types are not surfaced in the UI yet; tighten when they are.
   */
  async assertAccess(
    userId: number,
    targetType: string,
    targetId: number,
  ): Promise<void> {
    if (targetType === 'PAGE') {
      const row = await this.db.queryOne<{ ok: number }>(
        `SELECT 1 AS ok
         FROM \`Page\` p
         JOIN \`Chapter\` c ON c.chapter_id = p.chapter_id
         JOIN \`Series\` s ON s.series_id = c.series_id
         LEFT JOIN \`Series_Tantou_Editor\` ste
           ON ste.series_id = s.series_id
          AND ste.unassigned_at IS NULL
          AND ste.editor_user_id = ?
         WHERE p.page_id = ?
           AND (s.mangaka_user_id = ? OR ste.editor_user_id IS NOT NULL)
         LIMIT 1`,
        [userId, targetId, userId],
      );
      if (!row) {
        throw new ForbiddenException(
          'Bạn không có quyền truy cập góp ý của trang này',
        );
      }
    }
  }

  async create(userId: number, dto: CreateAnnotationDto) {
    const annotationId = await this.db.insert(
      `INSERT INTO \`Annotation\` (target_type, target_id, created_by_user_id, annotation_category, context, x_coordinate, y_coordinate)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        dto.targetType,
        dto.targetId,
        userId,
        dto.category,
        dto.context,
        dto.x ?? null,
        dto.y ?? null,
      ],
    );

    return this.findOne(annotationId);
  }

  async list(targetType: string, targetId: number) {
    return this.db.query(
      `SELECT
        annotation_id AS id,
        target_type AS targetType,
        target_id AS targetId,
        annotation_category AS category,
        context,
        x_coordinate AS x,
        y_coordinate AS y,
        is_resolved AS isResolved,
        created_at AS createdAt
       FROM \`Annotation\`
       WHERE target_type = ? AND target_id = ?
       ORDER BY created_at`,
      [targetType, targetId],
    );
  }

  async resolve(id: number) {
    await this.db.query(
      `UPDATE \`Annotation\` SET is_resolved = 1, resolved_at = NOW() WHERE annotation_id = ?`,
      [id],
    );
    return { ok: true };
  }

  private async findOne(annotationId: number) {
    const annotation = await this.db.queryOne<{
      annotation_id: number;
      target_type: string;
      target_id: number;
      annotation_category: string;
      context: string;
      x_coordinate: number | null;
      y_coordinate: number | null;
      is_resolved: boolean;
      created_at: string;
    }>(
      `SELECT
        annotation_id,
        target_type,
        target_id,
        annotation_category,
        context,
        x_coordinate,
        y_coordinate,
        is_resolved,
        created_at
       FROM \`Annotation\`
       WHERE annotation_id = ?`,
      [annotationId],
    );

    if (!annotation) {
      return null;
    }

    return {
      id: annotation.annotation_id,
      targetType: annotation.target_type,
      targetId: annotation.target_id,
      category: annotation.annotation_category,
      context: annotation.context,
      x: annotation.x_coordinate,
      y: annotation.y_coordinate,
      isResolved: annotation.is_resolved,
      createdAt: annotation.created_at,
    };
  }
}

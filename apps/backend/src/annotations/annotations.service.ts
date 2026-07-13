import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
import { CreateAnnotationDto } from './dto/create-annotation.dto';
import { AnnotationTargetType, Role } from '@manga/shared';

@Injectable()
export class AnnotationsService {
  constructor(private readonly db: DbService) {}

  async create(userId: number, dto: CreateAnnotationDto) {
    if (dto.targetType === AnnotationTargetType.SERIES) {
      throw new BadRequestException(
        'Vui lòng tạo báo cáo bảo vệ series từ hồ sơ bảo vệ Series.',
      );
    }

    // Only the series' active Tantou editor may annotate its pages/submissions.
    await this.assertActiveEditorOfTarget(userId, dto.targetType, dto.targetId);

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

    if (typeof this.db.query === 'function') {
      await this.db.query(
        `INSERT INTO \`Audit_Log\` (actor_user_id, action, entity_type, entity_id, after_value)
         VALUES (?, 'CREATE', 'Annotation', ?, ?)`,
        [
          userId,
          annotationId,
          JSON.stringify({
            targetType: dto.targetType,
            targetId: dto.targetId,
            category: dto.category,
          }),
        ],
      );
    }

    return this.findOne(annotationId);
  }

  async list(
    user: { id: number; role: Role },
    targetType: string,
    targetId: number,
  ) {
    await this.assertCanViewTarget(user, targetType, targetId);
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

  async resolve(userId: number, id: number) {
    const annotation = await this.db.queryOne<{
      target_type: string;
      target_id: number;
    }>(
      `SELECT target_type, target_id FROM \`Annotation\` WHERE annotation_id = ?`,
      [id],
    );
    if (!annotation) {
      throw new NotFoundException('Không tìm thấy ghi chú.');
    }
    // Only the target series' active editor may resolve its annotations.
    await this.assertActiveEditorOfTarget(
      userId,
      annotation.target_type,
      annotation.target_id,
    );
    await this.db.query(
      `UPDATE \`Annotation\` SET is_resolved = 1, resolved_at = NOW() WHERE annotation_id = ?`,
      [id],
    );
    return { ok: true };
  }

  /** Resolve the owning series id for an annotation target. */
  private async resolveSeriesId(
    targetType: string,
    targetId: number,
  ): Promise<number | null> {
    let sql: string;
    switch (targetType) {
      case AnnotationTargetType.PAGE:
        sql = `SELECT ch.series_id AS seriesId
               FROM \`Page\` p
               JOIN \`Chapter\` ch ON ch.chapter_id = p.chapter_id
               WHERE p.page_id = ?`;
        break;
      case AnnotationTargetType.SUBMISSION:
        sql = `SELECT ch.series_id AS seriesId
               FROM \`Submission\` sub
               JOIN \`Page\` p ON p.page_id = sub.page_id
               JOIN \`Chapter\` ch ON ch.chapter_id = p.chapter_id
               WHERE sub.submission_id = ?`;
        break;
      case AnnotationTargetType.MANUSCRIPT:
        sql = `SELECT ch.series_id AS seriesId
               FROM \`Manuscript\` m
               JOIN \`Chapter\` ch ON ch.chapter_id = m.chapter_id
               WHERE m.manuscript_id = ?`;
        break;
      case AnnotationTargetType.SERIES:
        sql = `SELECT series_id AS seriesId FROM \`Series\` WHERE series_id = ?`;
        break;
      default:
        return null;
    }
    const row = await this.db.queryOne<{ seriesId: number }>(sql, [targetId]);
    return row?.seriesId ?? null;
  }

  /** Assert the user is the active Tantou editor of the target's series. */
  private async assertActiveEditorOfTarget(
    userId: number,
    targetType: string,
    targetId: number,
  ): Promise<void> {
    const seriesId = await this.resolveSeriesId(targetType, targetId);
    if (!seriesId) {
      throw new NotFoundException('Không tìm thấy đối tượng ghi chú.');
    }
    const ok = await this.db.queryOne(
      `SELECT 1 AS ok FROM \`Series_Tantou_Editor\`
       WHERE series_id = ? AND editor_user_id = ? AND unassigned_at IS NULL
       LIMIT 1`,
      [seriesId, userId],
    );
    if (!ok) {
      throw new ForbiddenException(
        'Bạn không phải biên tập viên phụ trách của đối tượng này.',
      );
    }
  }

  /** Assert the user may view the target's annotations (active editor or owning mangaka). */
  private async assertCanViewTarget(
    user: { id: number; role: Role },
    targetType: string,
    targetId: number,
  ): Promise<void> {
    const seriesId = await this.resolveSeriesId(targetType, targetId);
    if (!seriesId) {
      throw new NotFoundException('Không tìm thấy đối tượng ghi chú.');
    }
    const sql =
      user.role === Role.MANGAKA
        ? `SELECT 1 AS ok FROM \`Series\` WHERE series_id = ? AND mangaka_user_id = ? LIMIT 1`
        : `SELECT 1 AS ok FROM \`Series_Tantou_Editor\` WHERE series_id = ? AND editor_user_id = ? AND unassigned_at IS NULL LIMIT 1`;
    const ok = await this.db.queryOne(sql, [seriesId, user.id]);
    if (!ok) {
      throw new ForbiddenException(
        'Bạn không có quyền xem ghi chú của đối tượng này.',
      );
    }
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

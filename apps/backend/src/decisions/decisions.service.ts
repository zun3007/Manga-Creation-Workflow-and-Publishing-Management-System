import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  DecisionType,
  Role,
  SeriesStatus,
  NotificationType,
} from '@manga/shared';
import { CreateDecisionDto } from './dto/create-decision.dto';

@Injectable()
export class DecisionsService {
  constructor(
    private readonly db: DbService,
    private readonly notifications: NotificationsService,
  ) {}

  async decide(boardUserId: number, dto: CreateDecisionDto) {
    // Step 1: Load series
    const series = await this.db.queryOne<{
      series_id: number;
      title: string;
      mangaka_user_id: number;
      series_status: SeriesStatus;
    }>(
      `SELECT series_id, title, mangaka_user_id, series_status FROM \`Series\` WHERE series_id = ?`,
      [dto.seriesId],
    );

    if (!series) {
      throw new NotFoundException('Series not found');
    }

    // A terminated series (cancelled/completed) is final — reject any new
    // decision so CONTINUE/CHANGE_FREQUENCY can't silently revive it.
    if (
      series.series_status === SeriesStatus.CANCELLED ||
      series.series_status === SeriesStatus.COMPLETED
    ) {
      throw new BadRequestException(
        'Series đã kết thúc (đã huỷ hoặc hoàn thành) — không thể ra quyết định mới.',
      );
    }

    // Step 2: Validate CHANGE_FREQUENCY requires newFrequency
    if (
      dto.decisionType === DecisionType.CHANGE_FREQUENCY &&
      !dto.newFrequency
    ) {
      throw new BadRequestException('Cần chọn tần suất mới');
    }

    // Step 3: Get latest ranking id (may be null)
    const rankingRow = await this.db.queryOne<{ ranking_id: number }>(
      `SELECT ranking_id FROM \`Ranking\` WHERE series_id = ? ORDER BY calculated_at DESC LIMIT 1`,
      [dto.seriesId],
    );

    // Steps 4-5: persist the decision and apply its effect to the series
    // atomically — a mid-sequence failure must not leave one without the other.
    const nextStatus: Record<DecisionType, SeriesStatus> = {
      [DecisionType.CONTINUE]: SeriesStatus.ACTIVE,
      [DecisionType.CHANGE_FREQUENCY]: SeriesStatus.ACTIVE,
      [DecisionType.CANCEL]: SeriesStatus.CANCELLED,
      [DecisionType.HIATUS]: SeriesStatus.HIATUS,
    };

    await this.db.transaction(async (tx) => {
      await tx.insert(
        `INSERT INTO \`Decision\` (series_id, ranking_id, decision_type, new_frequency, reason, decided_by_user_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          dto.seriesId,
          rankingRow?.ranking_id ?? null,
          dto.decisionType,
          dto.newFrequency ?? null,
          dto.reason,
          boardUserId,
        ],
      );

      if (dto.decisionType === DecisionType.CHANGE_FREQUENCY) {
        await tx.query(
          `UPDATE \`Series\` SET publication_frequency = ?, series_status = ? WHERE series_id = ?`,
          [dto.newFrequency, SeriesStatus.ACTIVE, dto.seriesId],
        );
      } else {
        await tx.query(
          `UPDATE \`Series\` SET series_status = ? WHERE series_id = ?`,
          [nextStatus[dto.decisionType], dto.seriesId],
        );
      }
    });

    const notificationTitle = this.decisionNotificationTitle(
      series.title,
      dto.decisionType,
    );
    const notificationContent = this.decisionNotificationContent(dto);

    // Step 6: Notify mangaka
    await this.notifications.notify(
      series.mangaka_user_id,
      NotificationType.DECISION,
      notificationTitle,
      notificationContent,
      'Series',
      dto.seriesId,
    );

    // Step 7: Notify active editors of this series
    const editors = await this.db.query<{ editor_user_id: number }>(
      `SELECT editor_user_id FROM \`Series_Tantou_Editor\` WHERE series_id = ? AND unassigned_at IS NULL`,
      [dto.seriesId],
    );

    for (const editor of editors) {
      await this.notifications.notify(
        editor.editor_user_id,
        NotificationType.DECISION,
        notificationTitle,
        notificationContent,
        'Series',
        dto.seriesId,
      );
    }

    return { ok: true };
  }

  async listForSeries(seriesId: number, user: { id: number; role: Role }) {
    // A mangaka may only read decisions for a series they own.
    if (user.role === Role.MANGAKA) {
      const owns = await this.db.queryOne(
        `SELECT 1 AS ok FROM \`Series\` WHERE series_id = ? AND mangaka_user_id = ? LIMIT 1`,
        [seriesId, user.id],
      );
      if (!owns) {
        throw new ForbiddenException(
          'Bạn không có quyền xem quyết định của series này.',
        );
      }
    }
    return this.db.query(
      `SELECT decision_id AS id, decision_type AS type, new_frequency AS newFrequency, reason, decided_at AS decidedAt
       FROM \`Decision\`
       WHERE series_id = ?
       ORDER BY decided_at DESC`,
      [seriesId],
    );
  }

  private decisionNotificationTitle(
    title: string,
    decisionType: DecisionType,
  ) {
    return `Hội đồng đã ${this.decisionLabel(decisionType)} series "${title}"`;
  }

  private decisionNotificationContent(dto: CreateDecisionDto) {
    const reason = dto.reason.trim();

    if (dto.decisionType === DecisionType.CANCEL) {
      return `Series đã bị hủy. Lý do series dừng lại: ${reason}`;
    }

    if (dto.decisionType === DecisionType.HIATUS) {
      return `Series đã tạm dừng. Lý do series dừng lại: ${reason}`;
    }

    if (dto.decisionType === DecisionType.CHANGE_FREQUENCY) {
      return `Series được đổi tần suất sang ${dto.newFrequency}. Lý do: ${reason}`;
    }

    return `Series được tiếp tục. Lý do: ${reason}`;
  }

  private decisionLabel(decisionType: DecisionType) {
    switch (decisionType) {
      case DecisionType.CANCEL:
        return 'hủy';
      case DecisionType.HIATUS:
        return 'tạm dừng';
      case DecisionType.CHANGE_FREQUENCY:
        return 'đổi tần suất cho';
      case DecisionType.CONTINUE:
      default:
        return 'cho tiếp tục';
    }
  }
}

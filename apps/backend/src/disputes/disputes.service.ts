import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  EarningDisputeStatus,
  EARNING_DISPUTE_TRANSITIONS,
  canTransition,
  NotificationType,
} from '@manga/shared';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';

@Injectable()
export class DisputesService {
  constructor(
    private readonly db: DbService,
    private readonly notifications: NotificationsService,
  ) {}

  async file(assistantUserId: number, dto: CreateDisputeDto) {
    // Verify task exists and assistant is assigned to it
    const task = await this.db.queryOne<{
      task_id: number;
      assignee_user_id: number;
      task_status: string;
      payment_amount: number;
    }>(
      `SELECT task_id, assignee_user_id, task_status, payment_amount
       FROM \`Task\`
       WHERE task_id = ?`,
      [dto.taskId],
    );

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.assignee_user_id !== assistantUserId) {
      throw new ForbiddenException('Không phải việc của bạn');
    }

    if (task.task_status !== 'APPROVED') {
      throw new BadRequestException(
        'Chỉ khiếu nại việc đã được duyệt/thanh toán',
      );
    }

    // Insert dispute
    const disputeId = await this.db.insert(
      `INSERT INTO \`Earning_Dispute\`
       (assistant_user_id, task_id, dispute_reason, expected_amount, dispute_status)
       VALUES (?, ?, ?, ?, ?)`,
      [
        assistantUserId,
        dto.taskId,
        dto.reason,
        dto.expectedAmount ?? null,
        EarningDisputeStatus.OPEN,
      ],
    );

    // Notify all active admins
    const admins = await this.db.query<{ user_id: number }>(
      `SELECT user_id FROM \`User\` WHERE role = ? AND is_activated = 1`,
      ['ADMIN'],
    );

    for (const admin of admins) {
      await this.notifications.notify(
        admin.user_id,
        NotificationType.DISPUTE,
        'Khiếu nại thu nhập mới',
        dto.reason,
        'Earning_Dispute',
        disputeId,
      );
    }

    return this.findOne(disputeId);
  }

  async mine(assistantUserId: number) {
    return this.db.query(
      `SELECT
        d.dispute_id AS id,
        d.task_id AS taskId,
        d.dispute_reason AS reason,
        d.expected_amount AS expectedAmount,
        d.dispute_status AS status,
        d.resolution_note AS resolutionNote,
        d.resolved_at AS resolvedAt,
        d.created_at AS createdAt,
        t.payment_amount AS currentAmount,
        t.task_description AS task
       FROM \`Earning_Dispute\` d
       JOIN \`Task\` t ON t.task_id = d.task_id
       WHERE d.assistant_user_id = ?
       ORDER BY d.created_at DESC`,
      [assistantUserId],
    );
  }

  async listAll() {
    return this.db.query(
      `SELECT
        d.dispute_id AS id,
        d.task_id AS taskId,
        d.dispute_reason AS reason,
        d.expected_amount AS expectedAmount,
        d.dispute_status AS status,
        d.resolution_note AS resolutionNote,
        d.resolved_at AS resolvedAt,
        d.created_at AS createdAt,
        t.payment_amount AS currentAmount,
        t.task_description AS task,
        (SELECT full_name FROM \`User\` u WHERE u.user_id = d.assistant_user_id) AS assistant
       FROM \`Earning_Dispute\` d
       JOIN \`Task\` t ON t.task_id = d.task_id
       ORDER BY FIELD(d.dispute_status, ?, ?, ?, ?), d.created_at DESC`,
      [
        EarningDisputeStatus.OPEN,
        EarningDisputeStatus.UNDER_REVIEW,
        EarningDisputeStatus.RESOLVED,
        EarningDisputeStatus.REJECTED,
      ],
    );
  }

  async markUnderReview(id: number, _adminId: number) {
    // Load dispute
    const dispute = await this.db.queryOne<{
      dispute_status: string;
    }>(`SELECT dispute_status FROM \`Earning_Dispute\` WHERE dispute_id = ?`, [
      id,
    ]);

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    // Check transition validity
    if (
      !canTransition(
        EARNING_DISPUTE_TRANSITIONS,
        dispute.dispute_status as EarningDisputeStatus,
        EarningDisputeStatus.UNDER_REVIEW,
      )
    ) {
      throw new BadRequestException(
        `Cannot transition dispute from ${dispute.dispute_status} to UNDER_REVIEW`,
      );
    }

    // Update dispute status
    await this.db.query(
      `UPDATE \`Earning_Dispute\` SET dispute_status = ? WHERE dispute_id = ?`,
      [EarningDisputeStatus.UNDER_REVIEW, id],
    );

    return { ok: true };
  }

  async resolve(id: number, adminId: number, dto: ResolveDisputeDto) {
    // Load dispute and task info
    const dispute = await this.db.queryOne<{
      dispute_status: string;
      task_id: number;
      assistant_user_id: number;
    }>(
      `SELECT dispute_status, task_id, assistant_user_id FROM \`Earning_Dispute\` WHERE dispute_id = ?`,
      [id],
    );

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    // Check transition validity
    if (
      !canTransition(
        EARNING_DISPUTE_TRANSITIONS,
        dispute.dispute_status as EarningDisputeStatus,
        dto.status as EarningDisputeStatus,
      )
    ) {
      throw new BadRequestException(
        `Cannot transition dispute from ${dispute.dispute_status} to ${dto.status}`,
      );
    }

    // Execute all DB writes in a single transaction
    await this.db.transaction(async (tx) => {
      // If resolving with adjusted amount, update task payment and assistant earnings
      if (dto.status === 'RESOLVED' && dto.adjustedAmount != null) {
        // Get current task payment
        const task = await tx.queryOne<{
          payment_amount: number;
        }>(`SELECT payment_amount FROM \`Task\` WHERE task_id = ?`, [
          dispute.task_id,
        ]);

        if (task) {
          const old = Number(task.payment_amount);
          const delta = dto.adjustedAmount - old;

          // Update task payment amount
          await tx.query(
            `UPDATE \`Task\` SET payment_amount = ? WHERE task_id = ?`,
            [dto.adjustedAmount, dispute.task_id],
          );

          // Update assistant profile earnings
          await tx.query(
            `UPDATE \`Assistant_Profile\` SET total_earnings = total_earnings + ? WHERE user_id = ?`,
            [delta, dispute.assistant_user_id],
          );
        }
      }

      // Update dispute resolution
      await tx.query(
        `UPDATE \`Earning_Dispute\`
         SET dispute_status = ?, resolution_note = ?, resolved_by_user_id = ?, resolved_at = NOW()
         WHERE dispute_id = ?`,
        [dto.status, dto.resolutionNote, adminId, id],
      );
    });

    // Notify assistant after transaction commits
    const resolutionTitle =
      dto.status === 'RESOLVED'
        ? 'Khiếu nại đã được giải quyết'
        : 'Khiếu nại bị từ chối';
    await this.notifications.notify(
      dispute.assistant_user_id,
      NotificationType.DISPUTE,
      resolutionTitle,
      dto.resolutionNote,
      'Earning_Dispute',
      id,
    );

    return { ok: true };
  }

  private async findOne(disputeId: number) {
    // Alias to the same camelCase shape as mine()/listAll() so callers (and POST response) get `id`.
    return this.db.queryOne(
      `SELECT
        dispute_id AS id,
        task_id AS taskId,
        assistant_user_id AS assistantUserId,
        dispute_reason AS reason,
        expected_amount AS expectedAmount,
        dispute_status AS status,
        resolution_note AS resolutionNote,
        resolved_by_user_id AS resolvedByUserId,
        resolved_at AS resolvedAt,
        created_at AS createdAt
       FROM \`Earning_Dispute\`
       WHERE dispute_id = ?`,
      [disputeId],
    );
  }
}

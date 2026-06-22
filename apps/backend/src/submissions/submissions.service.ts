import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  TaskStatus,
  SubmissionStatus,
  TASK_TRANSITIONS,
  SUBMISSION_TRANSITIONS,
  canTransition,
  NotificationType,
} from '@manga/shared';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { syncPageStatusFromTasks } from '../pages/page-status.util';

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly db: DbService,
    private readonly notifications: NotificationsService,
  ) {}

  async submit(assistantUserId: number, dto: CreateSubmissionDto) {
    // Load the task
    const task = await this.db.queryOne<{
      task_id: number;
      assignor_user_id: number;
      assignee_user_id: number;
      page_id: number;
      task_status: string;
    }>(
      `SELECT task_id, assignor_user_id, assignee_user_id, page_id, task_status
       FROM \`Task\`
       WHERE task_id = ?`,
      [dto.taskId],
    );

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Verify the assistant is assigned to this task
    if (task.assignee_user_id !== assistantUserId) {
      throw new ForbiddenException('You are not assigned to this task');
    }

    // Guard: task must be in IN_PROGRESS or REVISION_REQUIRED state to submit
    if (
      !canTransition(
        TASK_TRANSITIONS,
        task.task_status as TaskStatus,
        TaskStatus.SUBMITTED,
      )
    ) {
      throw new BadRequestException('Start the task before submitting');
    }

    // Atomically: compute the next version (locked), insert the submission,
    // advance the task to SUBMITTED, and reconcile the page — all in one
    // transaction so a mid-way failure can't leave the task marked SUBMITTED with
    // no submission row. The version is read FOR UPDATE and a duplicate-key
    // collision from two concurrent submits on the same task is retried, so the
    // UNIQUE(task_id, version_number) constraint never surfaces as a 500.
    let submissionId = 0;
    for (let attempt = 1; ; attempt++) {
      try {
        submissionId = await this.db.transaction(async (tx) => {
          const versionResult = await tx.queryOne<{ nextVersion: number }>(
            `SELECT COALESCE(MAX(version_number), 0) + 1 AS nextVersion
             FROM \`Submission\`
             WHERE task_id = ?
             FOR UPDATE`,
            [dto.taskId],
          );
          const version = versionResult?.nextVersion ?? 1;

          const id = await tx.insert(
            `INSERT INTO \`Submission\`
             (task_id, page_id, assistant_user_id, version_number, file_url, version_note, submission_status)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              dto.taskId,
              task.page_id,
              assistantUserId,
              version,
              dto.fileUrl,
              dto.versionNote ?? null,
              SubmissionStatus.PENDING,
            ],
          );

          // Update task status to SUBMITTED
          await tx.query(`UPDATE \`Task\` SET task_status = ? WHERE task_id = ?`, [
            TaskStatus.SUBMITTED,
            dto.taskId,
          ]);

          // Page enters review once its work is submitted (IN_PROGRESS -> REVIEWING)
          await syncPageStatusFromTasks(tx, task.page_id);
          return id;
        });
        break;
      } catch (e) {
        const dup =
          !!e &&
          typeof e === 'object' &&
          (e as { code?: string }).code === 'ER_DUP_ENTRY';
        if (dup && attempt < 3) continue;
        throw e;
      }
    }

    // Send notification to the mangaka (assignor)
    await this.notifications.notify(
      task.assignor_user_id,
      NotificationType.SUBMISSION,
      'Bài nộp mới',
      'Một assistant vừa nộp bài cho task của bạn.',
      'Submission',
      submissionId,
    );

    return this.findOne(submissionId);
  }

  async reviewQueue(mangakaUserId: number) {
    return this.db.query(
      `SELECT
        sub.submission_id AS id,
        sub.submission_status AS status,
        sub.version_note AS note,
        sub.file_url AS fileUrl,
        sub.submitted_at AS submittedAt,
        t.task_id AS taskId,
        t.task_description AS task,
        u.full_name AS assistant,
        u.avatar_url AS assistantAvatar,
        pv.image_url AS originalUrl
       FROM \`Submission\` sub
       JOIN \`Task\` t ON t.task_id = sub.task_id
       JOIN \`User\` u ON u.user_id = sub.assistant_user_id
       JOIN \`Page\` p ON p.page_id = sub.page_id
       LEFT JOIN \`Page_Version\` pv ON pv.page_id = p.page_id AND pv.version_number = p.current_version
       WHERE t.assignor_user_id = ? AND sub.submission_status IN (?, ?)
       ORDER BY sub.submitted_at ASC`,
      [mangakaUserId, SubmissionStatus.PENDING, SubmissionStatus.UNDER_REVIEW],
    );
  }

  async review(
    submissionId: number,
    mangakaUserId: number,
    decision: 'APPROVED' | 'REVISION_REQUIRED',
    feedback?: string,
  ) {
    // Load submission and task
    const row = await this.db.queryOne<{
      submission_id: number;
      submission_status: string;
      task_id: number;
      page_id: number;
      file_url: string;
      assistant_user_id: number;
      assignor_user_id: number;
      task_status: string;
    }>(
      `SELECT
        sub.submission_id,
        sub.submission_status,
        sub.task_id,
        sub.page_id,
        sub.file_url,
        sub.assistant_user_id,
        t.assignor_user_id,
        t.task_status
       FROM \`Submission\` sub
       JOIN \`Task\` t ON t.task_id = sub.task_id
       WHERE sub.submission_id = ?`,
      [submissionId],
    );

    if (!row) {
      throw new NotFoundException('Submission not found');
    }

    // Verify the mangaka owns the task (is the assignor)
    if (row.assignor_user_id !== mangakaUserId) {
      throw new ForbiddenException('You do not own this submission');
    }

    // Guard: can only transition from valid states
    const decisionStatus = decision as SubmissionStatus;
    if (
      !canTransition(
        SUBMISSION_TRANSITIONS,
        row.submission_status as SubmissionStatus,
        decisionStatus,
      )
    ) {
      throw new BadRequestException(
        `Cannot transition submission from ${row.submission_status} to ${decisionStatus}`,
      );
    }

    // Guard: task status must allow the transition to APPROVED or REVISION_REQUIRED
    const newTaskStatus =
      decision === 'APPROVED'
        ? TaskStatus.APPROVED
        : TaskStatus.REVISION_REQUIRED;
    if (
      !canTransition(
        TASK_TRANSITIONS,
        row.task_status as TaskStatus,
        newTaskStatus,
      )
    ) {
      throw new BadRequestException(
        `Cannot transition task from ${row.task_status} to ${newTaskStatus}`,
      );
    }

    // Execute all DB writes in a single transaction
    await this.db.transaction(async (tx) => {
      // Update submission
      await tx.query(
        `UPDATE \`Submission\`
         SET submission_status = ?, feedback = ?, reviewed_by_user_id = ?, reviewed_at = NOW()
         WHERE submission_id = ?`,
        [decisionStatus, feedback ?? null, mangakaUserId, submissionId],
      );

      // Update task
      await tx.query(`UPDATE \`Task\` SET task_status = ? WHERE task_id = ?`, [
        newTaskStatus,
        row.task_id,
      ]);

      // Accrue earnings to assistant profile
      if (decision === 'APPROVED') {
        await tx.query(
          `UPDATE \`Assistant_Profile\`
           SET total_earnings = total_earnings + COALESCE((SELECT payment_amount FROM \`Task\` WHERE task_id = ?), 0)
           WHERE user_id = ?`,
          [row.task_id, row.assistant_user_id],
        );

        // Apply the approved artwork to the page: the submitted file becomes the
        // page's new current version. Without this the original page never reflects
        // the assistant's accepted work (it stayed a standalone Submission row).
        const pv = await tx.queryOne<{ next: number }>(
          `SELECT COALESCE(MAX(version_number), 0) + 1 AS next FROM \`Page_Version\` WHERE page_id = ?`,
          [row.page_id],
        );
        const nextVersion = pv?.next ?? 1;
        await tx.query(
          `INSERT INTO \`Page_Version\` (page_id, version_number, image_url, uploaded_by_user_id, upload_note)
           VALUES (?, ?, ?, ?, ?)`,
          [row.page_id, nextVersion, row.file_url, row.assistant_user_id, 'Bài nộp đã duyệt'],
        );
        await tx.query(`UPDATE \`Page\` SET current_version = ? WHERE page_id = ?`, [
          nextVersion,
          row.page_id,
        ]);
      }

      // Reconcile the page: COMPLETED once all its tasks are APPROVED,
      // back to IN_PROGRESS when a revision is requested.
      await syncPageStatusFromTasks(tx, row.page_id);
    });

    // Send notification after transaction commits
    if (decision === 'APPROVED') {
      await this.notifications.notify(
        row.assistant_user_id,
        NotificationType.REVIEW,
        'Bài được duyệt',
        feedback || 'Mangaka đã duyệt bài của bạn.',
        'Submission',
        submissionId,
      );
    } else {
      // REVISION_REQUIRED
      await this.notifications.notify(
        row.assistant_user_id,
        NotificationType.REVISION,
        'Cần chỉnh sửa',
        feedback || 'Mangaka yêu cầu chỉnh sửa.',
        'Submission',
        submissionId,
      );
    }

    return { submissionId, decision };
  }

  private async findOne(submissionId: number) {
    return this.db.queryOne<{
      submission_id: number;
      task_id: number;
      page_id: number;
      assistant_user_id: number;
      version_number: number;
      file_url: string;
      version_note: string | null;
      submission_status: string;
      feedback: string | null;
      submitted_at: string;
      reviewed_by_user_id: number | null;
      reviewed_at: string | null;
    }>(
      `SELECT
        submission_id,
        task_id,
        page_id,
        assistant_user_id,
        version_number,
        file_url,
        version_note,
        submission_status,
        feedback,
        submitted_at,
        reviewed_by_user_id,
        reviewed_at
       FROM \`Submission\`
       WHERE submission_id = ?`,
      [submissionId],
    );
  }
}

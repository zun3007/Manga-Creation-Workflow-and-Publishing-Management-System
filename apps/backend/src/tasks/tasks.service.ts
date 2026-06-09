import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  TaskStatus,
  TASK_TRANSITIONS,
  canTransition,
  NotificationType,
  Role,
} from '@manga/shared';
import { CreateTaskDto } from './dto/create-task.dto';

@Injectable()
export class TasksService {
  private readonly logger = new Logger('TasksService');

  constructor(
    private readonly db: DbService,
    private readonly notifications: NotificationsService,
  ) {}

  async assign(mangakaUserId: number, dto: CreateTaskDto) {
    // Verify region exists and mangaka owns the series
    const region = await this.db.queryOne<{
      region_id: number;
      page_id: number;
      region_type: string;
    }>(
      `SELECT r.region_id, r.page_id, r.region_type
       FROM \`Region\` r
       JOIN \`Page\` p ON p.page_id = r.page_id
       JOIN \`Chapter\` c ON c.chapter_id = p.chapter_id
       JOIN \`Series\` s ON s.series_id = c.series_id
       WHERE r.region_id = ? AND s.mangaka_user_id = ?`,
      [dto.regionId, mangakaUserId],
    );

    if (!region) {
      throw new ForbiddenException('You do not own this region');
    }

    // Verify assignee is an ASSISTANT
    const assignee = await this.db.queryOne<{
      user_id: number;
      full_name: string;
      role: string;
    }>(
      `SELECT user_id, full_name, role FROM \`User\` WHERE user_id = ?`,
      [dto.assigneeUserId],
    );

    if (!assignee) {
      throw new NotFoundException('User not found');
    }

    if (assignee.role !== Role.ASSISTANT) {
      throw new BadRequestException('Assignee must be an assistant');
    }

    // Fetch the active price rule for this region type
    const rule = await this.db.queryOne<{
      rule_id: number;
      base_price: number;
    }>(
      `SELECT rule_id, base_price
       FROM \`Task_Price_Rule\`
       WHERE region_type = ? AND is_active = 1 AND (effective_to IS NULL OR effective_to >= CURDATE())
       ORDER BY effective_from DESC
       LIMIT 1`,
      [region.region_type],
    );

    const payment = rule?.base_price ?? 0;
    const ruleId = rule?.rule_id ?? null;

    // Warn if no price rule found for this region type
    let priceWarning: string | undefined;
    if (!rule) {
      priceWarning = 'Không có quy tắc giá cho loại vùng này — payment = 0';
      this.logger.warn(
        `No price rule found for region_type: ${region.region_type} (task for region_id: ${dto.regionId})`,
      );
    }

    // Create the task
    const taskId = await this.db.insert(
      `INSERT INTO \`Task\` (region_id, page_id, assignor_user_id, assignee_user_id, task_description, instruction, deadline, task_status, payment_amount, task_price_rule_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dto.regionId,
        region.page_id,
        mangakaUserId,
        dto.assigneeUserId,
        dto.description ?? null,
        dto.instruction ?? null,
        dto.deadline ?? null,
        TaskStatus.ASSIGNED,
        payment,
        ruleId,
      ],
    );

    // Update page status from RAW to ASSIGNED (only if it's currently RAW)
    await this.db.query(
      `UPDATE \`Page\` SET page_status = ? WHERE page_id = ? AND page_status = ?`,
      ['ASSIGNED', region.page_id, 'RAW'],
    );

    // Send notification to assignee
    await this.notifications.notify(
      dto.assigneeUserId,
      NotificationType.TASK_ASSIGNMENT,
      'Bạn có việc mới',
      dto.description || 'Một vùng đã được giao cho bạn',
      'Task',
      taskId,
    );

    const result = await this.findOne(taskId);
    if (priceWarning && result) {
      return { ...result, priceWarning };
    }
    return result;
  }

  async listMine(assistantUserId: number) {
    return this.db.query(
      `SELECT
        t.task_id AS id,
        t.task_description AS description,
        t.task_status AS status,
        t.deadline,
        t.payment_amount AS payment,
        t.instruction,
        s.title AS series,
        c.chapter_title AS chapter,
        p.page_number AS page,
        r.region_type AS regionType,
        pv.image_url AS pageImage
       FROM \`Task\` t
       JOIN \`Page\` p ON p.page_id = t.page_id
       JOIN \`Chapter\` c ON c.chapter_id = p.chapter_id
       JOIN \`Series\` s ON s.series_id = c.series_id
       JOIN \`Region\` r ON r.region_id = t.region_id
       LEFT JOIN \`Page_Version\` pv ON pv.page_id = p.page_id AND pv.version_number = p.current_version
       WHERE t.assignee_user_id = ?
       ORDER BY t.deadline IS NULL, t.deadline`,
      [assistantUserId],
    );
  }

  async listByPage(pageId: number, mangakaUserId: number) {
    // Verify mangaka owns the page via series
    const page = await this.db.queryOne<{ page_id: number }>(
      `SELECT p.page_id
       FROM \`Page\` p
       JOIN \`Chapter\` c ON c.chapter_id = p.chapter_id
       JOIN \`Series\` s ON s.series_id = c.series_id
       WHERE p.page_id = ? AND s.mangaka_user_id = ?`,
      [pageId, mangakaUserId],
    );

    if (!page) {
      throw new ForbiddenException('You do not own this page');
    }

    return this.db.query(
      `SELECT
        t.task_id AS id,
        t.task_description AS description,
        t.task_status AS status,
        t.deadline,
        t.payment_amount AS payment,
        u.full_name AS assigneeName,
        r.region_type AS regionType
       FROM \`Task\` t
       JOIN \`Page\` p ON p.page_id = t.page_id
       JOIN \`Region\` r ON r.region_id = t.region_id
       JOIN \`User\` u ON u.user_id = t.assignee_user_id
       WHERE p.page_id = ?
       ORDER BY t.created_at DESC`,
      [pageId],
    );
  }

  async start(taskId: number, assistantUserId: number) {
    const task = await this.findOne(taskId);

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.assignee_user_id !== assistantUserId) {
      throw new ForbiddenException('You are not assigned to this task');
    }

    if (
      !canTransition(TASK_TRANSITIONS, task.status as TaskStatus, TaskStatus.IN_PROGRESS)
    ) {
      throw new BadRequestException(
        `Cannot transition from ${task.status} to IN_PROGRESS`,
      );
    }

    await this.db.query(
      `UPDATE \`Task\` SET task_status = ? WHERE task_id = ?`,
      [TaskStatus.IN_PROGRESS, taskId],
    );

    return this.findOne(taskId);
  }

  private async findOne(taskId: number) {
    return this.db.queryOne<{
      task_id: number;
      region_id: number;
      page_id: number;
      assignor_user_id: number;
      assignee_user_id: number;
      task_description: string | null;
      instruction: string | null;
      deadline: string | null;
      status: string;
      payment_amount: number;
      task_price_rule_id: number | null;
      created_at: string;
      uploaded_at: string | null;
    }>(
      `SELECT
        t.task_id,
        t.region_id,
        t.page_id,
        t.assignor_user_id,
        t.assignee_user_id,
        t.task_description,
        t.instruction,
        t.deadline,
        t.task_status AS status,
        t.payment_amount,
        t.task_price_rule_id,
        t.created_at,
        t.uploaded_at
       FROM \`Task\` t
       WHERE t.task_id = ?`,
      [taskId],
    );
  }
}

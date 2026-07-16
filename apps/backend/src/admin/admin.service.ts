import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Role } from '@manga/shared';
import { DbService, type ITransactionContext } from '../db/db.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class AdminService {
  constructor(private readonly db: DbService) {}

  listUsers() {
    return this.db.query(
      `SELECT user_id AS id, email, full_name AS name, role, is_activated AS isActivated, must_change_password AS mustChangePassword, auth_provider AS authProvider, created_at AS createdAt
       FROM \`User\` ORDER BY role, full_name`,
      [],
    );
  }

  async createUser(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    const fullName = dto.fullName.trim();
    if (!fullName) throw new BadRequestException('Tên người dùng là bắt buộc');
    if (dto.role === Role.ADMIN) {
      throw new BadRequestException(
        'Hệ thống chỉ có một admin, không thể tạo thêm ADMIN',
      );
    }

    const existing = await this.db.queryOne<{ id: number }>(
      `SELECT user_id AS id FROM \`User\` WHERE email = ? LIMIT 1`,
      [email],
    );
    if (existing) throw new ConflictException('Email này đã tồn tại');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const userId = await this.db.transaction(async (tx) => {
      const id = await tx.insert(
        `INSERT INTO \`User\` (email, password_hash, full_name, avatar_url, role, auth_provider, google_id, is_activated, must_change_password)
         VALUES (?, ?, ?, NULL, ?, 'LOCAL', NULL, 1, 1)`,
        [email, passwordHash, fullName, dto.role],
      );
      await this.createDefaultProfile(tx, id, dto.role, fullName);
      return id;
    });

    const user = await this.db.queryOne(
      `SELECT user_id AS id, email, full_name AS name, role, is_activated AS isActivated, must_change_password AS mustChangePassword, auth_provider AS authProvider, created_at AS createdAt
       FROM \`User\` WHERE user_id = ?`,
      [userId],
    );
    if (!user) throw new Error('Failed to load created user');
    return user;
  }

  async updateUser(id: number, dto: UpdateUserDto) {
    return this.db.transaction(async (tx) => {
      const user = await tx.queryOne<{
        role: Role;
        is_activated: number;
        full_name: string;
      }>(
        `SELECT role, is_activated, full_name
         FROM \`User\`
         WHERE user_id = ?
         FOR UPDATE`,
        [id],
      );

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const roleChanging = dto.role !== undefined && dto.role !== user.role;

      const losingAdmin =
        user.role === Role.ADMIN &&
        Boolean(user.is_activated) &&
        (dto.isActivated === false ||
          (roleChanging && dto.role !== Role.ADMIN));

      if (losingAdmin) {
        const count = await tx.queryOne<{
          n: number | string;
        }>(
          `SELECT COUNT(*) AS n
           FROM \`User\`
           WHERE role = 'ADMIN'
             AND is_activated = 1`,
          [],
        );

        if (Number(count?.n ?? 0) <= 1) {
          throw new BadRequestException(
            'Cannot deactivate/demote the last active admin',
          );
        }
      }

      if (roleChanging && dto.role) {
        await this.assertRoleTransitionAllowed(tx, id, user.role);

        await this.deleteRoleProfile(tx, id, user.role);

        await this.createDefaultProfile(tx, id, dto.role, user.full_name);
      }

      const sets: string[] = [];
      const params: Array<string | number> = [];

      if (dto.isActivated !== undefined) {
        sets.push('is_activated = ?');
        params.push(dto.isActivated ? 1 : 0);
      }

      if (roleChanging && dto.role) {
        sets.push('role = ?');
        params.push(dto.role);
      }

      if (!sets.length) {
        return { ok: true };
      }

      params.push(id);

      await tx.query(
        `UPDATE \`User\`
         SET ${sets.join(', ')}
         WHERE user_id = ?`,
        params,
      );

      return { ok: true };
    });
  }

  private async assertRoleTransitionAllowed(
    tx: ITransactionContext,
    userId: number,
    currentRole: Role,
  ): Promise<void> {
    if (currentRole === Role.MANGAKA) {
      const history = await tx.queryOne<{
        proposals: number | string;
        series: number | string;
      }>(
        `SELECT
          (
            SELECT COUNT(*)
            FROM \`Series_Proposal\`
            WHERE mangaka_user_id = ?
          ) AS proposals,
          (
            SELECT COUNT(*)
            FROM \`Series\`
            WHERE mangaka_user_id = ?
          ) AS series`,
        [userId, userId],
      );

      if (
        Number(history?.proposals ?? 0) > 0 ||
        Number(history?.series ?? 0) > 0
      ) {
        throw new BadRequestException(
          'Không thể đổi vai trò: Mangaka đã có đề xuất hoặc series.',
        );
      }

      return;
    }

    if (currentRole === Role.ASSISTANT) {
      const history = await tx.queryOne<{
        tasks: number | string;
        submissions: number | string;
        disputes: number | string;
        earnings: number | string;
      }>(
        `SELECT
          (
            SELECT COUNT(*)
            FROM \`Task\`
            WHERE assignee_user_id = ?
          ) AS tasks,
          (
            SELECT COUNT(*)
            FROM \`Submission\`
            WHERE assistant_user_id = ?
          ) AS submissions,
          (
            SELECT COUNT(*)
            FROM \`Earning_Dispute\`
            WHERE assistant_user_id = ?
          ) AS disputes,
          COALESCE(
            (
              SELECT total_earnings
              FROM \`Assistant_Profile\`
              WHERE user_id = ?
            ),
            0
          ) AS earnings`,
        [userId, userId, userId, userId],
      );

      if (
        Number(history?.tasks ?? 0) > 0 ||
        Number(history?.submissions ?? 0) > 0 ||
        Number(history?.disputes ?? 0) > 0 ||
        Number(history?.earnings ?? 0) !== 0
      ) {
        throw new BadRequestException(
          'Không thể đổi vai trò: Assistant đã có task, bài nộp, khiếu nại hoặc thu nhập.',
        );
      }

      return;
    }

    if (currentRole === Role.TANTOU_EDITOR) {
      const history = await tx.queryOne<{
        assignments: number | string;
      }>(
        `SELECT COUNT(*) AS assignments
         FROM \`Series_Tantou_Editor\`
         WHERE editor_user_id = ?`,
        [userId],
      );

      if (Number(history?.assignments ?? 0) > 0) {
        throw new BadRequestException(
          'Không thể đổi vai trò: biên tập viên đã có lịch sử phụ trách series.',
        );
      }

      return;
    }

    if (currentRole === Role.EDITORIAL_BOARD) {
      const history = await tx.queryOne<{
        votes: number | string;
        decisions: number | string;
        schedules: number | string;
        imports: number | string;
        requests: number | string;
        approvals: number | string;
      }>(
        `SELECT
          (
            SELECT COUNT(*)
            FROM \`Vote\`
            WHERE board_user_id = ?
          ) AS votes,
          (
            SELECT COUNT(*)
            FROM \`Decision\`
            WHERE decided_by_user_id = ?
          ) AS decisions,
          (
            SELECT COUNT(*)
            FROM \`Publication_Schedule\`
            WHERE scheduled_by_user_id = ?
          ) AS schedules,
          (
            SELECT COUNT(*)
            FROM \`Reader_Vote_Import\`
            WHERE imported_by_user_id = ?
          ) AS imports,
          (
            SELECT COUNT(*)
            FROM \`Reader_Vote_Import_Delete_Request\`
            WHERE requested_by_user_id = ?
          ) AS requests,
          (
            SELECT COUNT(*)
            FROM \`Reader_Vote_Import_Delete_Approval\`
            WHERE board_user_id = ?
          ) AS approvals`,
        [userId, userId, userId, userId, userId, userId],
      );

      if (
        Number(history?.votes ?? 0) > 0 ||
        Number(history?.decisions ?? 0) > 0 ||
        Number(history?.schedules ?? 0) > 0 ||
        Number(history?.imports ?? 0) > 0 ||
        Number(history?.requests ?? 0) > 0 ||
        Number(history?.approvals ?? 0) > 0
      ) {
        throw new BadRequestException(
          'Không thể đổi vai trò: thành viên hội đồng đã có dữ liệu nghiệp vụ.',
        );
      }
    }
  }

  private async deleteRoleProfile(
    tx: ITransactionContext,
    userId: number,
    role: Role,
  ): Promise<void> {
    const table = this.profileTable(role);

    if (!table) {
      return;
    }

    await tx.query(
      `DELETE FROM \`${table}\`
       WHERE user_id = ?`,
      [userId],
    );
  }

  private profileTable(role: Role): string | null {
    switch (role) {
      case Role.MANGAKA:
        return 'Mangaka_Profile';

      case Role.ASSISTANT:
        return 'Assistant_Profile';

      case Role.TANTOU_EDITOR:
        return 'Tantou_Editor_Profile';

      case Role.EDITORIAL_BOARD:
        return 'Editorial_Board_Profile';

      default:
        return null;
    }
  }

  private async createDefaultProfile(
    tx: ITransactionContext,
    userId: number,
    role: Role,
    fullName: string,
  ) {
    if (role === Role.MANGAKA) {
      await tx.query(
        `INSERT INTO \`Mangaka_Profile\` (user_id, pen_name, years_experrence)
         VALUES (?, ?, 0)`,
        [userId, fullName],
      );
      return;
    }
    if (role === Role.ASSISTANT) {
      await tx.query(
        `INSERT INTO \`Assistant_Profile\` (user_id, salary_rate, total_earnings)
         VALUES (?, 0, 0)`,
        [userId],
      );
      return;
    }
    if (role === Role.TANTOU_EDITOR) {
      await tx.query(
        `INSERT INTO \`Tantou_Editor_Profile\` (user_id)
         VALUES (?)`,
        [userId],
      );
      return;
    }
    if (role === Role.EDITORIAL_BOARD) {
      await tx.query(
        `INSERT INTO \`Editorial_Board_Profile\` (user_id, position)
         VALUES (?, 'Board Member')`,
        [userId],
      );
    }
  }

  overview() {
    return this.db.queryOne(
      `SELECT
        (SELECT COUNT(*) FROM \`User\`) AS users,
        (SELECT COUNT(*) FROM \`User\` WHERE role='MANGAKA') AS mangaka,
        (SELECT COUNT(*) FROM \`User\` WHERE role='ASSISTANT') AS assistants,
        (SELECT COUNT(*) FROM \`User\` WHERE role='TANTOU_EDITOR') AS editors,
        (SELECT COUNT(*) FROM \`User\` WHERE role='EDITORIAL_BOARD') AS board,
        (SELECT COUNT(*) FROM \`Series\`) AS series,
        (SELECT COUNT(*) FROM \`Chapter\`) AS chapters,
        (SELECT COUNT(*) FROM \`Series_Proposal\`) AS proposals,
        (SELECT COUNT(*) FROM \`Task\` WHERE task_status <> 'APPROVED') AS openTasks`,
      [],
    );
  }
}

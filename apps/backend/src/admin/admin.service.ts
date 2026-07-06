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
      `SELECT user_id AS id, email, full_name AS name, role, is_activated AS isActivated, auth_provider AS authProvider, created_at AS createdAt
       FROM \`User\` ORDER BY role, full_name`,
      [],
    );
  }

  async createUser(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    const fullName = dto.fullName.trim();
    if (!fullName) throw new BadRequestException('Tên người dùng là bắt buộc');
    if (dto.role === Role.ADMIN) {
      throw new BadRequestException('Hệ thống chỉ có một admin, không thể tạo thêm ADMIN');
    }

    const existing = await this.db.queryOne<{ id: number }>(
      `SELECT user_id AS id FROM \`User\` WHERE email = ? LIMIT 1`,
      [email],
    );
    if (existing) throw new ConflictException('Email này đã tồn tại');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const userId = await this.db.transaction(async (tx) => {
      const id = await tx.insert(
        `INSERT INTO \`User\` (email, password_hash, full_name, avatar_url, role, auth_provider, google_id, is_activated)
         VALUES (?, ?, ?, NULL, ?, 'LOCAL', NULL, 1)`,
        [email, passwordHash, fullName, dto.role],
      );
      await this.createDefaultProfile(tx, id, dto.role, fullName);
      return id;
    });

    const user = await this.db.queryOne(
      `SELECT user_id AS id, email, full_name AS name, role, is_activated AS isActivated, auth_provider AS authProvider, created_at AS createdAt
       FROM \`User\` WHERE user_id = ?`,
      [userId],
    );
    if (!user) throw new Error('Failed to load created user');
    return user;
  }

  async updateUser(id: number, dto: UpdateUserDto) {
    const u = await this.db.queryOne<{ role: string; is_activated: number }>(
      `SELECT role, is_activated FROM \`User\` WHERE user_id = ?`,
      [id],
    );
    if (!u) throw new NotFoundException('User not found');

    if (dto.role === Role.ADMIN) {
      throw new BadRequestException('Hệ thống chỉ có một admin, không thể gán thêm ADMIN');
    }

    // guard: don't remove the last active admin
    const losingAdmin =
      u.role === 'ADMIN' &&
      (dto.isActivated === false || dto.role !== undefined);
    if (losingAdmin) {
      const cnt = await this.db.queryOne<{ n: number }>(
        `SELECT COUNT(*) AS n FROM \`User\` WHERE role='ADMIN' AND is_activated=1`,
        [],
      );
      if ((cnt?.n ?? 0) <= 1)
        throw new BadRequestException(
          'Cannot deactivate/demote the last active admin',
        );
    }

    const sets: string[] = [];
    const params: any[] = [];
    if (dto.isActivated !== undefined) {
      sets.push('is_activated = ?');
      params.push(dto.isActivated ? 1 : 0);
    }
    if (dto.role !== undefined) {
      sets.push('role = ?');
      params.push(dto.role);
    }
    if (!sets.length) return { ok: true };
    params.push(id);
    await this.db.query(
      `UPDATE \`User\` SET ${sets.join(', ')} WHERE user_id = ?`,
      params,
    );
    return { ok: true };
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

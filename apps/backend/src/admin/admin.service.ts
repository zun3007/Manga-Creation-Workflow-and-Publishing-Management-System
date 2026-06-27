import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
import { UpdateUserDto } from './dto/update-user.dto';

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

  async updateUser(id: number, dto: UpdateUserDto) {
    const u = await this.db.queryOne<{ role: string; is_activated: number }>(
      `SELECT role, is_activated FROM \`User\` WHERE user_id = ?`,
      [id],
    );
    if (!u) throw new NotFoundException('User not found');

    // guard: don't remove the last active admin
    const losingAdmin =
      u.role === 'ADMIN' &&
      (dto.isActivated === false || (dto.role && dto.role !== 'ADMIN'));
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

import { Injectable } from '@nestjs/common';
import { Role } from '@manga/shared';
import { DbService } from '../db/db.service';

export interface UserRow {
  user_id: number;
  email: string;
  password_hash: string | null;
  full_name: string;
  avatar_url: string | null;
  role: Role;
  auth_provider: string;
  google_id: string | null;
  is_activated: number;
  must_change_password: number;
}

const BASE_COLS =
  'user_id, email, password_hash, full_name, avatar_url, role, auth_provider, google_id, is_activated, must_change_password';

@Injectable()
export class UsersService {
  constructor(private readonly db: DbService) {}

  findByEmail(email: string): Promise<UserRow | null> {
    return this.db.queryOne<UserRow>(
      `SELECT ${BASE_COLS} FROM \`User\` WHERE email = ? LIMIT 1`,
      [email],
    );
  }

  findById(id: number): Promise<UserRow | null> {
    return this.db.queryOne<UserRow>(
      `SELECT ${BASE_COLS} FROM \`User\` WHERE user_id = ? LIMIT 1`,
      [id],
    );
  }

  async updatePassword(userId: number, passwordHash: string): Promise<void> {
    await this.db.query(
      `UPDATE \`User\`
       SET password_hash = ?, must_change_password = 0
       WHERE user_id = ?`,
      [passwordHash, userId],
    );
  }

  async linkGoogle(userId: number, googleId: string): Promise<void> {
    await this.db.query(
      `UPDATE \`User\` SET google_id = ? WHERE user_id = ? AND google_id IS NULL`,
      [googleId, userId],
    );
  }

  async getProfile(userId: number): Promise<{
    id: number;
    email: string;
    fullName: string;
    avatarUrl: string | null;
    role: Role;
  } | null> {
    const user = await this.db.queryOne<{
      user_id: number;
      email: string;
      full_name: string;
      avatar_url: string | null;
      role: Role;
    }>(
      `SELECT user_id, email, full_name, avatar_url, role
       FROM \`User\`
       WHERE user_id = ?`,
      [userId],
    );

    if (!user) {
      return null;
    }

    return {
      id: user.user_id,
      email: user.email,
      fullName: user.full_name,
      avatarUrl: user.avatar_url,
      role: user.role,
    };
  }

  async updateProfile(
    userId: number,
    fullName?: string,
    avatarUrl?: string,
  ): Promise<{
    id: number;
    email: string;
    fullName: string;
    avatarUrl: string | null;
    role: Role;
  } | null> {
    const updates: string[] = [];
    const params: any[] = [];

    if (fullName !== undefined) {
      updates.push('full_name = ?');
      params.push(fullName);
    }

    if (avatarUrl !== undefined) {
      updates.push('avatar_url = ?');
      params.push(avatarUrl);
    }

    if (updates.length === 0) {
      // Nothing to update, just return current profile
      return this.getProfile(userId);
    }

    params.push(userId);

    await this.db.query(
      `UPDATE \`User\` SET ${updates.join(', ')} WHERE user_id = ?`,
      params,
    );

    return this.getProfile(userId);
  }
}

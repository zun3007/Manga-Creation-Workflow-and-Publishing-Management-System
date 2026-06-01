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
}

const BASE_COLS =
  'user_id, email, password_hash, full_name, avatar_url, role, auth_provider, google_id, is_activated';

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
      `UPDATE \`User\` SET password_hash = ? WHERE user_id = ?`,
      [passwordHash, userId],
    );
  }

  async linkGoogle(userId: number, googleId: string): Promise<void> {
    await this.db.query(
      `UPDATE \`User\` SET google_id = ?, auth_provider = 'GOOGLE' WHERE user_id = ? AND google_id IS NULL`,
      [googleId, userId],
    );
  }

  async createGoogleUser(
    email: string,
    fullName: string,
    avatarUrl: string | null,
    googleId: string,
  ): Promise<UserRow> {
    await this.db.query(
      `INSERT INTO \`User\` (email, password_hash, full_name, avatar_url, role, auth_provider, google_id, is_activated)
       VALUES (?, NULL, ?, ?, 'MANGAKA', 'GOOGLE', ?, 1)`,
      [email, fullName, avatarUrl, googleId],
    );
    const user = await this.findByEmail(email);
    if (!user) {
      throw new Error(`Failed to retrieve created user with email ${email}`);
    }
    return user;
  }
}

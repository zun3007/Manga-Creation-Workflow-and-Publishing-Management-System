import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { DbService } from '../db/db.service';

/**
 * On boot, (re)apply the bcrypt password for the demo login account so that
 * email/password login always works regardless of how the DB was seeded.
 */
@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger('SeedService');

  constructor(
    private readonly db: DbService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    const password = this.config.get<string>(
      'DEMO_USER_PASSWORD',
      'Dung123456@',
    );
    const primary = this.config.get<string>(
      'DEMO_USER_EMAIL',
      'dungminer69@gmail.com',
    );
    const emails = [
      primary,
      'mai.assistant@inkframe.studio', // ASSISTANT (seed user 2)
      'hiroshi.editor@inkframe.studio', // TANTOU_EDITOR (seed user 5)
      'yamamoto.board@inkframe.studio', // EDITORIAL_BOARD (seed user 6)
      'admin@inkframe.studio', // ADMIN (seed user 7)
    ];
    try {
      const hash = await bcrypt.hash(password, 10);
      for (const email of emails) {
        const r: any = await this.db.query(
          'UPDATE `User` SET password_hash = ? WHERE email = ?',
          [hash, email],
        );
        if (r?.affectedRows) this.logger.log(`Demo login ready → ${email}`);
      }
    } catch (err: any) {
      this.logger.error(
        `Could not apply demo passwords: ${err?.message ?? err}`,
      );
    }
  }
}

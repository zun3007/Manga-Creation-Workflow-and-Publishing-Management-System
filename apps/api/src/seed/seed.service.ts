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
    const email = this.config.get<string>('DEMO_USER_EMAIL', 'dungminer69@gmail.com');
    const password = this.config.get<string>('DEMO_USER_PASSWORD', 'Dung123456@');
    try {
      const user = await this.db.queryOne(
        'SELECT user_id FROM `User` WHERE email = ?',
        [email],
      );
      if (!user) {
        this.logger.warn(`Demo user ${email} not found yet — is the DB seeded?`);
        return;
      }
      const hash = await bcrypt.hash(password, 10);
      await this.db.query('UPDATE `User` SET password_hash = ? WHERE email = ?', [
        hash,
        email,
      ]);
      this.logger.log(`Demo login ready → ${email}`);
    } catch (err: any) {
      this.logger.error(`Could not apply demo password: ${err?.message ?? err}`);
    }
  }
}

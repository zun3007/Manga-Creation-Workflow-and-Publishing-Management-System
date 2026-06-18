import {
  Injectable,
  OnModuleInit,
  Logger,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { randomInt } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { DbService } from '../db/db.service';

const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;
/** 1 initial code + 5 resends within the TTL window. */
const MAX_CODES_PER_WINDOW = 6;

/**
 * Email OTP persistence + verification. All time logic lives in SQL (NOW(), DATE_ADD)
 * to avoid app/DB clock skew. The active code for a user is the newest row that is
 * not consumed and not expired.
 */
@Injectable()
export class OtpService implements OnModuleInit {
  private readonly logger = new Logger('OtpService');

  constructor(private readonly db: DbService) {}

  /** Ensure the table exists even on a pre-existing DB volume (idempotent). */
  async onModuleInit(): Promise<void> {
    try {
      await this.db.query(
        `CREATE TABLE IF NOT EXISTS \`Email_Otp\` (
           \`otp_id\`      BIGINT       NOT NULL AUTO_INCREMENT,
           \`user_id\`     BIGINT       NOT NULL,
           \`code_hash\`   VARCHAR(255) NOT NULL,
           \`purpose\`     VARCHAR(32)  NOT NULL DEFAULT 'login',
           \`attempts\`    INT          NOT NULL DEFAULT 0,
           \`expires_at\`  DATETIME     NOT NULL,
           \`consumed_at\` DATETIME     NULL,
           \`created_at\`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
           PRIMARY KEY (\`otp_id\`),
           INDEX \`idx_email_otp_user\` (\`user_id\`),
           INDEX \`idx_email_otp_live\` (\`user_id\`, \`consumed_at\`, \`expires_at\`),
           CONSTRAINT \`fk_email_otp_user\` FOREIGN KEY (\`user_id\`)
             REFERENCES \`User\` (\`user_id\`) ON DELETE CASCADE
         )`,
      );
      this.logger.log('Email_Otp table ready');
    } catch (err: any) {
      this.logger.error(
        `Could not ensure Email_Otp table: ${err?.message ?? err}`,
      );
    }
  }

  /**
   * Generate a fresh 6-digit code, invalidate any prior live codes for the user,
   * and persist a bcrypt hash. Returns the plaintext code (to be mailed).
   */
  async issue(userId: number, ttlMinutes: number): Promise<string> {
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const hash = await bcrypt.hash(code, 10);
    await this.db.query(
      `UPDATE \`Email_Otp\` SET consumed_at = NOW() WHERE user_id = ? AND consumed_at IS NULL`,
      [userId],
    );
    await this.db.insert(
      `INSERT INTO \`Email_Otp\` (user_id, code_hash, purpose, expires_at)
       VALUES (?, ?, 'login', DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
      [userId, hash, ttlMinutes],
    );
    return code;
  }

  /** Throws 429 on cooldown / too-many-requests. Call before issue() on a resend. */
  async assertCanResend(userId: number, ttlMinutes: number): Promise<void> {
    const row = await this.db.queryOne<{
      age: number | null;
      recent: number;
    }>(
      `SELECT
         (SELECT TIMESTAMPDIFF(SECOND, created_at, NOW()) FROM \`Email_Otp\`
            WHERE user_id = ? ORDER BY otp_id DESC LIMIT 1) AS age,
         (SELECT COUNT(*) FROM \`Email_Otp\`
            WHERE user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL ? MINUTE)) AS recent`,
      [userId, userId, ttlMinutes],
    );

    const age = row?.age;
    if (age != null && age < RESEND_COOLDOWN_SECONDS) {
      const wait = RESEND_COOLDOWN_SECONDS - age;
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Vui lòng đợi ${wait}s trước khi gửi lại mã`,
          error: 'Too Many Requests',
          cooldownSeconds: wait,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if ((row?.recent ?? 0) >= MAX_CODES_PER_WINDOW) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Bạn đã yêu cầu mã quá nhiều lần, vui lòng thử lại sau',
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /**
   * Verify a code for a user. Marks the code consumed on success.
   * Throws UnauthorizedException (expired / locked) or BadRequestException (wrong).
   */
  async verify(userId: number, code: string): Promise<void> {
    const row = await this.db.queryOne<{
      otp_id: number;
      code_hash: string;
      attempts: number;
    }>(
      `SELECT otp_id, code_hash, attempts FROM \`Email_Otp\`
        WHERE user_id = ? AND consumed_at IS NULL AND expires_at > NOW()
        ORDER BY otp_id DESC LIMIT 1`,
      [userId],
    );

    if (!row) {
      throw new UnauthorizedException(
        'Mã đã hết hạn hoặc không tồn tại. Vui lòng gửi lại mã.',
      );
    }

    if (row.attempts >= MAX_ATTEMPTS) {
      await this.consume(row.otp_id);
      throw new UnauthorizedException(
        'Bạn đã nhập sai quá số lần cho phép. Vui lòng gửi lại mã.',
      );
    }

    const ok = await bcrypt.compare(code, row.code_hash);
    if (!ok) {
      const attempts = row.attempts + 1;
      if (attempts >= MAX_ATTEMPTS) {
        await this.db.query(
          `UPDATE \`Email_Otp\` SET attempts = ?, consumed_at = NOW() WHERE otp_id = ?`,
          [attempts, row.otp_id],
        );
        throw new UnauthorizedException(
          'Bạn đã nhập sai quá số lần cho phép. Vui lòng gửi lại mã.',
        );
      }
      await this.db.query(
        `UPDATE \`Email_Otp\` SET attempts = ? WHERE otp_id = ?`,
        [attempts, row.otp_id],
      );
      // 401 (not 400) so the web client's axios interceptor stays silent on /login
      // and the OTP screen shows the error inline — consistent with wrong-password.
      throw new UnauthorizedException(
        `Mã không đúng. Còn ${MAX_ATTEMPTS - attempts} lần thử.`,
      );
    }

    await this.consume(row.otp_id);
  }

  private async consume(otpId: number): Promise<void> {
    await this.db.query(
      `UPDATE \`Email_Otp\` SET consumed_at = NOW() WHERE otp_id = ?`,
      [otpId],
    );
  }
}

import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * Provider-agnostic SMTP mailer (nodemailer). Configured entirely from env so the
 * same code works against Brevo, Gmail App Password, Mailtrap, Resend, etc.
 *
 *   SMTP_HOST, SMTP_PORT (default 587), SMTP_SECURE (default false),
 *   SMTP_USER, SMTP_PASS, MAIL_FROM
 *
 * When SMTP is not configured AND not in production, the OTP is logged instead of
 * mailed so local dev works with zero credentials. In production, missing SMTP or a
 * send failure surfaces as 503.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger('MailService');
  private transporter: Transporter | null = null;
  private resolved = false;

  constructor(private readonly config: ConfigService) {}

  private get isProd(): boolean {
    return this.config.get<string>('NODE_ENV') === 'production';
  }

  /** Build the transport once, lazily. Returns null when SMTP env is incomplete. */
  private getTransporter(): Transporter | null {
    if (this.resolved) return this.transporter;
    this.resolved = true;

    const host = this.config.get<string>('SMTP_HOST');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    if (!host || !user || !pass) {
      this.transporter = null;
      return null;
    }

    const port = Number(this.config.get<string>('SMTP_PORT', '587'));
    const secure = this.config.get<string>('SMTP_SECURE', 'false') === 'true';
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure, // true for 465, false for 587 (STARTTLS)
      auth: { user, pass },
    });
    this.logger.log(`SMTP transport ready → ${host}:${port}`);
    return this.transporter;
  }

  /** Send a login OTP. Throws ServiceUnavailableException on misconfig/failure in prod. */
  async sendOtp(to: string, code: string, ttlMinutes: number): Promise<void> {
    const from = this.config.get<string>(
      'MAIL_FROM',
      'Manga Studio <no-reply@manga.local>',
    );
    const subject = `Mã xác thực đăng nhập: ${code}`;
    const text =
      `Mã xác thực (OTP) của bạn là ${code}.\n` +
      `Mã có hiệu lực trong ${ttlMinutes} phút.\n\n` +
      `Nếu bạn không yêu cầu đăng nhập, hãy bỏ qua email này.`;
    const html = this.renderOtpHtml(code, ttlMinutes);

    const tx = this.getTransporter();
    if (!tx) {
      if (this.isProd) {
        throw new ServiceUnavailableException(
          'Dịch vụ email chưa được cấu hình',
        );
      }
      this.logger.warn(
        `[DEV] SMTP not configured — OTP for ${to} is ${code} (valid ${ttlMinutes}m)`,
      );
      return;
    }

    try {
      await tx.sendMail({ from, to, subject, text, html });
      this.logger.log(`OTP email sent → ${to}`);
    } catch (err: any) {
      this.logger.error(`OTP email failed → ${to}: ${err?.message ?? err}`);
      throw new ServiceUnavailableException(
        'Không gửi được mã xác thực, vui lòng thử lại',
      );
    }
  }

  private renderOtpHtml(code: string, ttlMinutes: number): string {
    return `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:440px;margin:0 auto;padding:24px;color:#1f2430">
  <h2 style="margin:0 0 8px;font-size:18px;color:#6d5dd3">Mã xác thực đăng nhập</h2>
  <p style="margin:0 0 16px;font-size:14px;color:#5a6072">Nhập mã sau để hoàn tất đăng nhập:</p>
  <div style="font-size:32px;font-weight:700;letter-spacing:8px;text-align:center;padding:16px;background:#f4f1fd;border-radius:12px;color:#3a3550">${code}</div>
  <p style="margin:16px 0 0;font-size:13px;color:#8a90a2">Mã có hiệu lực trong <strong>${ttlMinutes} phút</strong>. Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
</div>`;
  }
}

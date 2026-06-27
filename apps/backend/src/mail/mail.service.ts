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
 * Gmail (good enough for a demo — a personal account works; ~100–150 mails/day):
 *   1. Enable 2-Step Verification on the Google account.
 *   2. Google Account → Security → App passwords → generate one (16 chars).
 *   3. Put these in apps/backend/.env (NOT committed):
 *        SMTP_HOST=smtp.gmail.com
 *        SMTP_PORT=587
 *        SMTP_SECURE=false           # STARTTLS on 587
 *        SMTP_USER=your.address@gmail.com
 *        SMTP_PASS=<the 16-char app password, no spaces>
 *        MAIL_FROM=Manga Studio <your.address@gmail.com>
 *   ("Less secure apps" was removed Sept 2024, so a normal password won't work.)
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

  /**
   * On-brand "Sakura Studio" OTP email. Email clients strip <style>/CSS vars and
   * many ignore fl<box>/grid, so this is table-based with inline styles and the
   * brand palette hardcoded (paper #FBF7F4, ink #4A4039, coral #E58A86, line #ECE2DA).
   */
  private renderOtpHtml(code: string, ttlMinutes: number): string {
    const digits = code
      .split('')
      .map(
        (d) =>
          `<span style="display:inline-block;min-width:34px;margin:0 4px;padding:10px 0;background:#FFFFFF;border:1px solid #ECE2DA;border-radius:10px;font-size:26px;font-weight:700;color:#4A4039;font-family:'Spline Sans Mono',ui-monospace,'Courier New',monospace">${d}</span>`,
      )
      .join('');
    return `<!doctype html>
<html lang="vi"><body style="margin:0;padding:0;background:#FBF7F4">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBF7F4;padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:460px;background:#FFFFFF;border:1px solid #ECE2DA;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(180,150,140,.12)">
        <tr><td style="padding:22px 28px;border-bottom:1px solid #ECE2DA">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="vertical-align:middle"><span style="display:inline-block;width:34px;height:34px;line-height:34px;text-align:center;background:#E58A86;color:#FFFFFF;border-radius:9px;font-size:19px;font-family:'Noto Serif',Georgia,serif">墨</span></td>
            <td style="vertical-align:middle;padding-left:10px;font-family:'Noto Serif',Georgia,serif;font-size:16px;font-weight:700;color:#4A4039;letter-spacing:.02em">Manga Studio</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:28px">
          <h1 style="margin:0 0 6px;font-family:'Noto Serif',Georgia,serif;font-size:20px;font-weight:700;color:#4A4039">Mã xác thực đăng nhập</h1>
          <p style="margin:0 0 22px;font-family:'Be Vietnam Pro',-apple-system,Segoe UI,Roboto,sans-serif;font-size:14px;line-height:1.5;color:#8A8078">Nhập mã 6 số dưới đây để hoàn tất đăng nhập vào studio của bạn.</p>
          <div style="text-align:center;padding:18px;background:#FBF7F4;border-radius:12px">${digits}</div>
          <p style="margin:22px 0 0;font-family:'Be Vietnam Pro',-apple-system,Segoe UI,Roboto,sans-serif;font-size:13px;line-height:1.55;color:#8A8078">Mã có hiệu lực trong <strong style="color:#4A4039">${ttlMinutes} phút</strong>. Vì lý do an toàn, đừng chia sẻ mã này với bất kỳ ai.</p>
        </td></tr>
        <tr><td style="padding:16px 28px;border-top:1px solid #ECE2DA;background:#FBF7F4">
          <p style="margin:0;font-family:'Be Vietnam Pro',-apple-system,Segoe UI,Roboto,sans-serif;font-size:12px;line-height:1.5;color:#A89E94">Bạn không yêu cầu đăng nhập? Có thể bỏ qua email này một cách an toàn — sẽ không có thay đổi nào với tài khoản của bạn.</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-family:'Be Vietnam Pro',-apple-system,Segoe UI,Roboto,sans-serif;font-size:11px;color:#C2B8AE">© Manga Studio · Email tự động, vui lòng không trả lời.</p>
    </td></tr>
  </table>
</body></html>`;
  }
}

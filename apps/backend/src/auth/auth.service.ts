import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import {
  AuthUser,
  JwtPayload,
  AuthSuccess,
  LoginResponse,
  TwoFactorRequired,
  ResendResult,
} from '@manga/shared';
import { UsersService, UserRow } from '../users/users.service';
import { GoogleUser } from './google.strategy';
import { MailService } from '../mail/mail.service';
import { OtpService } from './otp.service';

/** Payload of the short-lived 2FA challenge token (distinct from the access token). */
interface ChallengePayload {
  sub: number;
  typ: '2fa';
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
    private readonly otp: OtpService,
  ) {}

  // ── config helpers ─────────────────────────────────────────────────────────
  /** Global kill-switch (default ON). Set AUTH_2FA_ENABLED=false to bypass 2FA. */
  private get twoFactorEnabled(): boolean {
    return this.config.get<string>('AUTH_2FA_ENABLED', 'true') !== 'false';
  }
  private get ttlMinutes(): number {
    return Number(this.config.get<string>('OTP_TTL_MINUTES', '10'));
  }
  /** DEV ONLY echo of the OTP in the response — never active in production. */
  private get devEcho(): boolean {
    const smtpConfigured = Boolean(
      this.config.get<string>('SMTP_HOST') &&
        this.config.get<string>('SMTP_USER') &&
        this.config.get<string>('SMTP_PASS'),
    );
    return (
      this.config.get<string>('NODE_ENV') !== 'production' &&
      (this.config.get<string>('OTP_DEV_ECHO') === 'true' || !smtpConfigured)
    );
  }
  /** Separate secret so a challenge token can never be used as an access token. */
  private get challengeSecret(): string {
    return `${this.config.get<string>('JWT_SECRET', 'dev-secret')}::2fa-challenge`;
  }

  // ── login ────────────────────────────────────────────────────────────────
  async validateLocal(email: string, password: string): Promise<LoginResponse> {
    const user = await this.users.findByEmail(email);
    if (!user || !user.password_hash) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }
    if (!this.twoFactorEnabled) {
      return this.issue(user);
    }
    return this.beginTwoFactor(user);
  }

  /** Google OAuth login is exempt from email 2FA (identity already federated). */
  async validateGoogle(profile: GoogleUser): Promise<AuthSuccess> {
    if (!profile.email) {
      throw new UnauthorizedException('Google account has no email');
    }
    let user = await this.users.findByEmail(profile.email);
    if (user) {
      if (!user.google_id) {
        await this.users.linkGoogle(user.user_id, profile.googleId);
      }
    } else {
      user = await this.users.createGoogleUser(
        profile.email,
        profile.name,
        profile.avatar,
        profile.googleId,
      );
    }
    return this.issue(user);
  }

  // ── 2FA ────────────────────────────────────────────────────────────────────
  private async beginTwoFactor(user: UserRow): Promise<TwoFactorRequired> {
    const ttl = this.ttlMinutes;
    const code = await this.otp.issue(user.user_id, ttl);
    await this.mail.sendOtp(user.email, code, ttl);

    const challengeToken = this.jwt.sign(
      { sub: user.user_id, typ: '2fa' } satisfies ChallengePayload,
      { secret: this.challengeSecret, expiresIn: `${ttl}m` },
    );

    const res: TwoFactorRequired = {
      twoFactorRequired: true,
      challengeToken,
      emailMasked: this.maskEmail(user.email),
      expiresIn: ttl * 60,
    };
    if (this.devEcho) res.devCode = code;
    return res;
  }

  async verifyTwoFactor(
    challengeToken: string,
    code: string,
  ): Promise<AuthSuccess> {
    const userId = this.decodeChallenge(challengeToken);
    await this.otp.verify(userId, code);
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException('Không tìm thấy người dùng');
    return this.issue(user);
  }

  async resendOtp(challengeToken: string): Promise<ResendResult> {
    const userId = this.decodeChallenge(challengeToken);
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException('Không tìm thấy người dùng');

    const ttl = this.ttlMinutes;
    await this.otp.assertCanResend(userId, ttl);
    const code = await this.otp.issue(userId, ttl);
    await this.mail.sendOtp(user.email, code, ttl);

    const res: ResendResult = { ok: true, cooldownSeconds: 60 };
    if (this.devEcho) res.devCode = code;
    return res;
  }

  private decodeChallenge(token: string): number {
    let payload: ChallengePayload;
    try {
      payload = this.jwt.verify<ChallengePayload>(token, {
        secret: this.challengeSecret,
      });
    } catch {
      throw new UnauthorizedException(
        'Phiên xác thực đã hết hạn. Vui lòng đăng nhập lại.',
      );
    }
    if (payload.typ !== '2fa' || !payload.sub) {
      throw new UnauthorizedException('Token xác thực không hợp lệ');
    }
    return payload.sub;
  }

  private maskEmail(email: string): string {
    const at = email.indexOf('@');
    if (at <= 0) return '•••';
    const local = email.slice(0, at);
    const domain = email.slice(at + 1);
    const head = local.slice(0, 1);
    return `${head}${'•'.repeat(Math.max(1, local.length - 1))}@${domain}`;
  }

  // ── change password (unchanged) ─────────────────────────────────────────────
  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException('Không tìm thấy người dùng');
    if (!user.password_hash) {
      throw new BadRequestException(
        'Tài khoản đăng nhập bằng Google không dùng mật khẩu nội bộ',
      );
    }
    const ok = await bcrypt.compare(currentPassword, user.password_hash);
    if (!ok) throw new BadRequestException('Mật khẩu hiện tại không đúng');
    if (currentPassword === newPassword) {
      throw new BadRequestException('Mật khẩu mới phải khác mật khẩu hiện tại');
    }
    const hash = await bcrypt.hash(newPassword, 10);
    await this.users.updatePassword(userId, hash);
    return { ok: true };
  }

  // ── token issuance ───────────────────────────────────────────────────────
  private issue(user: UserRow): AuthSuccess {
    const payload: JwtPayload = {
      sub: user.user_id,
      email: user.email,
      role: user.role,
      name: user.full_name,
    };
    return {
      accessToken: this.jwt.sign(payload),
      user: this.publicUser(user),
    };
  }

  private publicUser(user: UserRow): AuthUser {
    return {
      id: user.user_id,
      email: user.email,
      name: user.full_name,
      role: user.role,
      avatarUrl: user.avatar_url,
    };
  }
}

import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import {
  AuthUser,
  JwtPayload,
  AuthSuccess,
  LoginResponse,
  TwoFactorRequired,
  PasswordChangeRequired,
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

interface PasswordChangeChallengePayload {
  sub: number;
  typ: 'password-change';
}

interface PasswordResetChallengePayload {
  email: string;
  typ: 'password-reset-otp';
}

interface PasswordResetGrantPayload {
  sub: number;
  passwordVersion: string;
  typ: 'password-reset';
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

  private get passwordChangeTtlMinutes(): number {
    return Number(
      this.config.get<string>('INITIAL_PASSWORD_CHANGE_TTL_MINUTES', '15'),
    );
  }

  private get passwordChangeSecret(): string {
    return `${this.config.get<string>('JWT_SECRET', 'dev-secret')}::password-change-challenge`;
  }

  private get passwordResetChallengeSecret(): string {
    return `${this.config.get<string>('JWT_SECRET', 'dev-secret')}::password-reset-otp`;
  }

  private get passwordResetSecret(): string {
    return `${this.config.get<string>('JWT_SECRET', 'dev-secret')}::password-reset`;
  }

  private get passwordResetTtlMinutes(): number {
    return Number(this.config.get<string>('PASSWORD_RESET_TTL_MINUTES', '15'));
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
    this.assertActive(user);

    if (user.must_change_password) {
      return this.beginInitialPasswordChange(user);
    }

    if (!this.twoFactorEnabled) {
      return this.issue(user);
    }

    return this.beginTwoFactor(user);
  }

  /** Google OAuth login is exempt from email 2FA (identity already federated). */
  async validateGoogle(profile: GoogleUser): Promise<AuthSuccess> {
    const email = profile.email.trim().toLowerCase();
    if (!email || !profile.googleId) {
      throw new UnauthorizedException('Google account has no email');
    }
    let user = await this.users.findByEmail(email);
    if (user) {
      this.assertActive(user);
      if (user.google_id && user.google_id !== profile.googleId) {
        throw new UnauthorizedException(
          'Tài khoản Google không khớp với tài khoản đã liên kết.',
        );
      }
      if (!user.google_id) {
        await this.users.linkGoogle(user.user_id, profile.googleId);
      }
    } else {
      throw new UnauthorizedException(
        'Tài khoản chưa được quản trị viên cấp quyền truy cập.',
      );
    }
    return this.issue(user);
  }

  // ── initial password change ────────────────────────────────────────────────
  private beginInitialPasswordChange(user: UserRow): PasswordChangeRequired {
    const ttl = this.passwordChangeTtlMinutes;

    const challengeToken = this.jwt.sign(
      {
        sub: user.user_id,
        typ: 'password-change',
      } satisfies PasswordChangeChallengePayload,
      {
        secret: this.passwordChangeSecret,
        expiresIn: `${ttl}m`,
      },
    );

    return {
      passwordChangeRequired: true,
      challengeToken,
      expiresIn: ttl * 60,
    };
  }

  async completeInitialPasswordChange(
    challengeToken: string,
    newPassword: string,
  ): Promise<LoginResponse> {
    const userId = this.decodePasswordChangeChallenge(challengeToken);

    const user = await this.users.findById(userId);

    if (!user) {
      throw new UnauthorizedException('Không tìm thấy người dùng');
    }

    this.assertActive(user);

    if (user.auth_provider !== 'LOCAL' || !user.password_hash) {
      throw new BadRequestException(
        'Tài khoản này không sử dụng mật khẩu nội bộ',
      );
    }

    if (!user.must_change_password) {
      throw new BadRequestException('Mật khẩu ban đầu đã được thay đổi');
    }

    const reusedPassword = await bcrypt.compare(
      newPassword,
      user.password_hash,
    );

    if (reusedPassword) {
      throw new BadRequestException('Mật khẩu mới phải khác mật khẩu ban đầu');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.users.updatePassword(user.user_id, passwordHash);

    const updatedUser = await this.users.findById(user.user_id);

    if (!updatedUser) {
      throw new UnauthorizedException('Không tìm thấy người dùng');
    }

    if (!this.twoFactorEnabled) {
      return this.issue(updatedUser);
    }

    return this.beginTwoFactor(updatedUser);
  }

  private decodePasswordChangeChallenge(token: string): number {
    let payload: PasswordChangeChallengePayload;

    try {
      payload = this.jwt.verify<PasswordChangeChallengePayload>(token, {
        secret: this.passwordChangeSecret,
      });
    } catch {
      throw new UnauthorizedException(
        'Phiên đổi mật khẩu đã hết hạn. Vui lòng đăng nhập lại.',
      );
    }

    if (payload.typ !== 'password-change' || !payload.sub) {
      throw new UnauthorizedException('Token đổi mật khẩu không hợp lệ');
    }

    return payload.sub;
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

  // ── forgot password ───────────────────────────────────────────────────────
  async beginForgotPassword(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.users.findByEmail(normalizedEmail);
    const eligible = this.isPasswordResetEligible(user);
    const ttl = this.ttlMinutes;
    let devCode: string | undefined;

    if (eligible && user) {
      const code = await this.otp.issue(
        user.user_id,
        ttl,
        'password-reset',
      );
      await this.mail.sendPasswordResetOtp(user.email, code, ttl);
      if (this.devEcho) devCode = code;
    }

    const challengeToken = this.jwt.sign(
      {
        email: normalizedEmail,
        typ: 'password-reset-otp',
      } satisfies PasswordResetChallengePayload,
      {
        secret: this.passwordResetChallengeSecret,
        expiresIn: `${ttl}m`,
      },
    );

    return {
      ok: true as const,
      message:
        'Nếu email thuộc tài khoản hợp lệ, mã OTP đã được gửi đến hộp thư.',
      challengeToken,
      emailMasked: this.maskEmail(normalizedEmail),
      expiresIn: ttl * 60,
      ...(devCode ? { devCode } : {}),
    };
  }

  async verifyPasswordResetOtp(challengeToken: string, code: string) {
    const email = this.decodePasswordResetChallenge(challengeToken);
    const user = await this.users.findByEmail(email);

    if (!this.isPasswordResetEligible(user) || !user?.password_hash) {
      throw new UnauthorizedException('Mã xác thực không hợp lệ hoặc đã hết hạn');
    }

    await this.otp.verify(user.user_id, code, 'password-reset');

    return {
      resetToken: this.jwt.sign(
        {
          sub: user.user_id,
          passwordVersion: this.passwordVersion(user.password_hash),
          typ: 'password-reset',
        } satisfies PasswordResetGrantPayload,
        {
          secret: this.passwordResetSecret,
          expiresIn: `${this.passwordResetTtlMinutes}m`,
        },
      ),
      expiresIn: this.passwordResetTtlMinutes * 60,
    };
  }

  async resendPasswordResetOtp(challengeToken: string) {
    const email = this.decodePasswordResetChallenge(challengeToken);
    const user = await this.users.findByEmail(email);
    const ttl = this.ttlMinutes;
    let devCode: string | undefined;

    if (this.isPasswordResetEligible(user) && user) {
      await this.otp.assertCanResend(
        user.user_id,
        ttl,
        'password-reset',
      );
      const code = await this.otp.issue(
        user.user_id,
        ttl,
        'password-reset',
      );
      await this.mail.sendPasswordResetOtp(user.email, code, ttl);
      if (this.devEcho) devCode = code;
    }

    return {
      ok: true as const,
      cooldownSeconds: 60,
      ...(devCode ? { devCode } : {}),
    };
  }

  async resetPassword(resetToken: string, newPassword: string) {
    const payload = this.decodePasswordResetGrant(resetToken);
    const user = await this.users.findById(payload.sub);

    if (!this.isPasswordResetEligible(user) || !user?.password_hash) {
      throw new UnauthorizedException('Phiên đặt lại mật khẩu không hợp lệ');
    }

    if (this.passwordVersion(user.password_hash) !== payload.passwordVersion) {
      throw new UnauthorizedException(
        'Phiên đặt lại mật khẩu đã được sử dụng hoặc không còn hợp lệ',
      );
    }

    if (await bcrypt.compare(newPassword, user.password_hash)) {
      throw new BadRequestException('Mật khẩu mới phải khác mật khẩu hiện tại');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.users.updatePassword(user.user_id, passwordHash);
    return { ok: true as const };
  }

  private decodePasswordResetChallenge(token: string): string {
    let payload: PasswordResetChallengePayload;

    try {
      payload = this.jwt.verify<PasswordResetChallengePayload>(token, {
        secret: this.passwordResetChallengeSecret,
      });
    } catch {
      throw new UnauthorizedException(
        'Phiên xác thực đã hết hạn. Vui lòng yêu cầu mã mới.',
      );
    }

    if (payload.typ !== 'password-reset-otp' || !payload.email) {
      throw new UnauthorizedException('Token xác thực không hợp lệ');
    }

    return payload.email;
  }

  private decodePasswordResetGrant(token: string): PasswordResetGrantPayload {
    let payload: PasswordResetGrantPayload;

    try {
      payload = this.jwt.verify<PasswordResetGrantPayload>(token, {
        secret: this.passwordResetSecret,
      });
    } catch {
      throw new UnauthorizedException(
        'Phiên đặt lại mật khẩu đã hết hạn. Vui lòng thử lại.',
      );
    }

    if (
      payload.typ !== 'password-reset' ||
      !payload.sub ||
      !payload.passwordVersion
    ) {
      throw new UnauthorizedException('Token đặt lại mật khẩu không hợp lệ');
    }

    return payload;
  }

  private isPasswordResetEligible(user: UserRow | null): boolean {
    return Boolean(
      user?.is_activated &&
        user.auth_provider === 'LOCAL' &&
        user.password_hash,
    );
  }

  private passwordVersion(passwordHash: string): string {
    return createHash('sha256').update(passwordHash).digest('hex');
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
    // Backstop for every auth path (local, Google, post-2FA): a deactivated
    // account can never receive an access token.
    this.assertActive(user);
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

  /** Reject authentication for deactivated accounts (admin lockout must bite). */
  private assertActive(user: UserRow): void {
    if (!user.is_activated) {
      throw new UnauthorizedException(
        'Tài khoản đã bị vô hiệu hoá. Vui lòng liên hệ quản trị viên.',
      );
    }
  }
}

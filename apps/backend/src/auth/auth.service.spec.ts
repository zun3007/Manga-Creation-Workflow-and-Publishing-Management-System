import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

const makeConfig = (env: Record<string, string | undefined>) =>
  ({
    get: (key: string, def?: string) =>
      env[key] !== undefined ? env[key] : def,
  }) as any;

const baseUser = async () => ({
  user_id: 1,
  email: 'dung@example.com',
  password_hash: await bcrypt.hash('pw123456', 10),
  full_name: 'Dung',
  avatar_url: null,
  role: 'ADMIN',
  auth_provider: 'LOCAL',
  google_id: null,
  is_activated: 1,
});

const deps = (over: Partial<Record<string, any>> = {}) => {
  const users = { findByEmail: jest.fn(), findById: jest.fn() };
  const jwt = {
    sign: jest.fn(() => 'signed.jwt'),
    verify: jest.fn(() => ({ sub: 1, typ: '2fa' })),
  };
  const mail = { sendOtp: jest.fn().mockResolvedValue(undefined) };
  const otp = {
    issue: jest.fn().mockResolvedValue('123456'),
    verify: jest.fn().mockResolvedValue(undefined),
    assertCanResend: jest.fn().mockResolvedValue(undefined),
  };
  const config = makeConfig(over.env ?? {});
  const svc = new AuthService(
    users as any,
    jwt as any,
    config,
    mail as any,
    otp as any,
  );
  return { svc, users, jwt, mail, otp };
};

describe('AuthService.validateLocal', () => {
  it('triggers an email OTP challenge on a correct password (2FA on by default)', async () => {
    // Configure SMTP so devEcho is off (otherwise the OTP is echoed in dev
    // when no mailer is configured, which is the intended local-dev behaviour).
    const { svc, users, otp, mail } = deps({
      env: { SMTP_HOST: 'smtp.example.com', SMTP_USER: 'u', SMTP_PASS: 'p' },
    });
    users.findByEmail.mockResolvedValue(await baseUser());

    const res: any = await svc.validateLocal('dung@example.com', 'pw123456');

    expect(res.twoFactorRequired).toBe(true);
    expect(res.challengeToken).toBe('signed.jwt');
    expect(res.emailMasked).toBe('d•••@example.com');
    expect(res.expiresIn).toBe(600);
    expect(res.devCode).toBeUndefined(); // OTP_DEV_ECHO off
    expect(otp.issue).toHaveBeenCalledWith(1, 10);
    expect(mail.sendOtp).toHaveBeenCalledWith('dung@example.com', '123456', 10);
  });

  it('rejects a wrong password before any OTP is issued', async () => {
    const { svc, users, otp } = deps();
    users.findByEmail.mockResolvedValue(await baseUser());
    await expect(
      svc.validateLocal('dung@example.com', 'WRONG'),
    ).rejects.toThrow(/không đúng/i);
    expect(otp.issue).not.toHaveBeenCalled();
  });

  it('issues an access token directly when AUTH_2FA_ENABLED=false', async () => {
    const { svc, users, otp } = deps({ env: { AUTH_2FA_ENABLED: 'false' } });
    users.findByEmail.mockResolvedValue(await baseUser());
    const res: any = await svc.validateLocal('dung@example.com', 'pw123456');
    expect(res.accessToken).toBe('signed.jwt');
    expect(res.user.id).toBe(1);
    expect(otp.issue).not.toHaveBeenCalled();
  });

  it('echoes devCode when OTP_DEV_ECHO=true and not production', async () => {
    const { svc, users } = deps({ env: { OTP_DEV_ECHO: 'true' } });
    users.findByEmail.mockResolvedValue(await baseUser());
    const res: any = await svc.validateLocal('dung@example.com', 'pw123456');
    expect(res.devCode).toBe('123456');
  });
});

describe('AuthService.verifyTwoFactor', () => {
  it('verifies the OTP and issues an access token', async () => {
    const { svc, users, otp } = deps();
    users.findById.mockResolvedValue(await baseUser());
    const res: any = await svc.verifyTwoFactor('challenge.jwt', '123456');
    expect(otp.verify).toHaveBeenCalledWith(1, '123456');
    expect(res.accessToken).toBe('signed.jwt');
    expect(res.user.role).toBe('ADMIN');
  });

  it('rejects an invalid / expired challenge token', async () => {
    const { svc, jwt, otp } = deps();
    jwt.verify.mockImplementation(() => {
      throw new Error('jwt expired');
    });
    await expect(
      svc.verifyTwoFactor('bad.jwt', '123456'),
    ).rejects.toThrow(/hết hạn|đăng nhập lại/i);
    expect(otp.verify).not.toHaveBeenCalled();
  });

  it('rejects a challenge token that is not typed as 2fa', async () => {
    const { svc, jwt } = deps();
    jwt.verify.mockReturnValue({ sub: 1 }); // missing typ:'2fa'
    await expect(
      svc.verifyTwoFactor('access.jwt', '123456'),
    ).rejects.toThrow(/không hợp lệ/i);
  });
});

describe('AuthService.resendOtp', () => {
  it('checks cooldown, issues a fresh code and mails it', async () => {
    const { svc, users, otp, mail } = deps();
    users.findById.mockResolvedValue(await baseUser());
    const res: any = await svc.resendOtp('challenge.jwt');
    expect(otp.assertCanResend).toHaveBeenCalledWith(1, 10);
    expect(otp.issue).toHaveBeenCalledWith(1, 10);
    expect(mail.sendOtp).toHaveBeenCalled();
    expect(res).toMatchObject({ ok: true, cooldownSeconds: 60 });
  });
});

import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
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
  must_change_password: 0,
});

const deps = (over: Partial<Record<string, any>> = {}) => {
  const users = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    linkGoogle: jest.fn().mockResolvedValue(undefined),
    updatePassword: jest.fn().mockResolvedValue(undefined),
  };
  const jwt = {
    sign: jest.fn(() => 'signed.jwt'),
    verify: jest.fn(() => ({ sub: 1, typ: '2fa' })),
  };
  const mail = {
    sendOtp: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetOtp: jest.fn().mockResolvedValue(undefined),
  };
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

describe('AuthService.validateGoogle', () => {
  const googleProfile = {
    googleId: 'google-user-123',
    email: 'DUNG@EXAMPLE.COM',
    name: 'Dung Google',
    avatar: null,
  };

  it('links an Admin-created account by normalized email and keeps its role', async () => {
    const { svc, users } = deps();
    users.findByEmail.mockResolvedValue(await baseUser());

    const result = await svc.validateGoogle(googleProfile);

    expect(users.findByEmail).toHaveBeenCalledWith('dung@example.com');
    expect(users.linkGoogle).toHaveBeenCalledWith(1, 'google-user-123');
    expect(result.user.role).toBe('ADMIN');
    expect(result.accessToken).toBe('signed.jwt');
  });

  it('rejects a different Google identity after the account was linked', async () => {
    const { svc, users } = deps();
    users.findByEmail.mockResolvedValue({
      ...(await baseUser()),
      google_id: 'another-google-user',
    });

    await expect(svc.validateGoogle(googleProfile)).rejects.toThrow(
      /Google không khớp/i,
    );
    expect(users.linkGoogle).not.toHaveBeenCalled();
  });

  it('does not link Google to a deactivated account', async () => {
    const { svc, users } = deps();
    users.findByEmail.mockResolvedValue({
      ...(await baseUser()),
      is_activated: 0,
    });

    await expect(svc.validateGoogle(googleProfile)).rejects.toThrow(
      /vô hiệu hoá/i,
    );
    expect(users.linkGoogle).not.toHaveBeenCalled();
  });

  it('rejects a Google email that was not provisioned by Admin', async () => {
    const { svc, users, jwt } = deps();
    users.findByEmail.mockResolvedValue(null);

    await expect(svc.validateGoogle(googleProfile)).rejects.toThrow(
      /chưa được quản trị viên cấp/i,
    );
    expect(users.linkGoogle).not.toHaveBeenCalled();
    expect(jwt.sign).not.toHaveBeenCalled();
  });
});

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

  it('skips OTP when the same browser presents a valid trusted token', async () => {
    const { svc, users, jwt, otp, mail } = deps();
    const user = await baseUser();
    users.findByEmail.mockResolvedValue(user);
    jwt.verify.mockReturnValue({
      sub: user.user_id,
      typ: 'trusted-browser',
      passwordVersion: createHash('sha256')
        .update(user.password_hash)
        .digest('hex'),
    });

    const result: any = await svc.validateLocal(
      user.email,
      'pw123456',
      'trusted.jwt',
    );

    expect(result.accessToken).toBe('signed.jwt');
    expect(otp.issue).not.toHaveBeenCalled();
    expect(mail.sendOtp).not.toHaveBeenCalled();
  });

  it('requires OTP when the trusted-browser token is invalid', async () => {
    const { svc, users, jwt, otp } = deps();
    const user = await baseUser();
    users.findByEmail.mockResolvedValue(user);
    jwt.verify.mockImplementation(() => {
      throw new Error('expired');
    });

    const result: any = await svc.validateLocal(
      user.email,
      'pw123456',
      'expired.jwt',
    );

    expect(result.twoFactorRequired).toBe(true);
    expect(otp.issue).toHaveBeenCalledWith(user.user_id, 10);
  });

  it('requires OTP after the password hash changes', async () => {
    const { svc, users, jwt, otp } = deps();
    const user = await baseUser();
    users.findByEmail.mockResolvedValue(user);
    jwt.verify.mockReturnValue({
      sub: user.user_id,
      typ: 'trusted-browser',
      passwordVersion: createHash('sha256').update('old-hash').digest('hex'),
    });

    const result: any = await svc.validateLocal(
      user.email,
      'pw123456',
      'trusted.jwt',
    );

    expect(result.twoFactorRequired).toBe(true);
    expect(otp.issue).toHaveBeenCalled();
  });
});

describe('AuthService initial password change', () => {
  it('returns a password-change challenge instead of an access token', async () => {
    const { svc, users, jwt, otp } = deps();
    const user = await baseUser();
    user.must_change_password = 1;

    users.findByEmail.mockResolvedValue(user);

    const res: any = await svc.validateLocal('dung@example.com', 'pw123456');

    expect(res).toMatchObject({
      passwordChangeRequired: true,
      challengeToken: 'signed.jwt',
      expiresIn: 900,
    });

    expect(res.accessToken).toBeUndefined();
    expect(otp.issue).not.toHaveBeenCalled();

    expect(jwt.sign).toHaveBeenCalledWith(
      {
        sub: 1,
        typ: 'password-change',
      },
      expect.objectContaining({
        expiresIn: '15m',
      }),
    );
  });

  it('changes the initial password and issues a token when 2FA is disabled', async () => {
    const { svc, users, jwt, otp } = deps({
      env: {
        AUTH_2FA_ENABLED: 'false',
      },
    });

    const initialUser = await baseUser();
    initialUser.must_change_password = 1;

    jwt.verify.mockReturnValue({
      sub: 1,
      typ: 'password-change',
    });

    users.findById.mockResolvedValueOnce(initialUser).mockResolvedValueOnce({
      ...initialUser,
      must_change_password: 0,
    });

    const res: any = await svc.completeInitialPasswordChange(
      'password-change.jwt',
      'NewPassword123!',
    );

    expect(users.updatePassword).toHaveBeenCalledTimes(1);
    expect(users.updatePassword).toHaveBeenCalledWith(1, expect.any(String));

    const savedHash = users.updatePassword.mock.calls[0][1];

    expect(await bcrypt.compare('NewPassword123!', savedHash)).toBe(true);

    expect(res.accessToken).toBe('signed.jwt');
    expect(res.user.id).toBe(1);
    expect(otp.issue).not.toHaveBeenCalled();
  });

  it('continues to 2FA after the initial password is changed', async () => {
    const { svc, users, jwt, otp, mail } = deps({
      env: {
        SMTP_HOST: 'smtp.example.com',
        SMTP_USER: 'user',
        SMTP_PASS: 'password',
      },
    });

    const initialUser = await baseUser();
    initialUser.must_change_password = 1;

    jwt.verify.mockReturnValue({
      sub: 1,
      typ: 'password-change',
    });

    users.findById.mockResolvedValueOnce(initialUser).mockResolvedValueOnce({
      ...initialUser,
      must_change_password: 0,
    });

    const res: any = await svc.completeInitialPasswordChange(
      'password-change.jwt',
      'NewPassword123!',
    );

    expect(res.twoFactorRequired).toBe(true);
    expect(res.challengeToken).toBe('signed.jwt');
    expect(otp.issue).toHaveBeenCalledWith(1, 10);
    expect(mail.sendOtp).toHaveBeenCalled();
  });

  it('rejects reuse of the temporary password', async () => {
    const { svc, users, jwt } = deps();
    const initialUser = await baseUser();
    initialUser.must_change_password = 1;

    jwt.verify.mockReturnValue({
      sub: 1,
      typ: 'password-change',
    });

    users.findById.mockResolvedValue(initialUser);

    await expect(
      svc.completeInitialPasswordChange('password-change.jwt', 'pw123456'),
    ).rejects.toThrow(/khác mật khẩu ban đầu/i);

    expect(users.updatePassword).not.toHaveBeenCalled();
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
    await expect(svc.verifyTwoFactor('bad.jwt', '123456')).rejects.toThrow(
      /hết hạn|đăng nhập lại/i,
    );
    expect(otp.verify).not.toHaveBeenCalled();
  });

  it('rejects a challenge token that is not typed as 2fa', async () => {
    const { svc, jwt } = deps();
    jwt.verify.mockReturnValue({ sub: 1 }); // missing typ:'2fa'
    await expect(svc.verifyTwoFactor('access.jwt', '123456')).rejects.toThrow(
      /không hợp lệ/i,
    );
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

describe('AuthService forgot password', () => {
  it('issues and mails a purpose-scoped OTP for an eligible local account', async () => {
    const { svc, users, otp, mail, jwt } = deps({
      env: { OTP_DEV_ECHO: 'true' },
    });
    users.findByEmail.mockResolvedValue(await baseUser());

    const result = await svc.beginForgotPassword(' DUNG@EXAMPLE.COM ');

    expect(users.findByEmail).toHaveBeenCalledWith('dung@example.com');
    expect(otp.issue).toHaveBeenCalledWith(1, 10, 'password-reset');
    expect(mail.sendPasswordResetOtp).toHaveBeenCalledWith(
      'dung@example.com',
      '123456',
      10,
    );
    expect(jwt.sign).toHaveBeenCalledWith(
      { email: 'dung@example.com', typ: 'password-reset-otp' },
      expect.objectContaining({ expiresIn: '10m' }),
    );
    expect(result).toMatchObject({
      ok: true,
      challengeToken: 'signed.jwt',
      devCode: '123456',
    });
  });

  it('returns the same generic response without issuing an OTP for an unknown email', async () => {
    const { svc, users, otp, mail } = deps();
    users.findByEmail.mockResolvedValue(null);

    const result = await svc.beginForgotPassword('unknown@example.com');

    expect(result.ok).toBe(true);
    expect(result.message).toMatch(/nếu email/i);
    expect(otp.issue).not.toHaveBeenCalled();
    expect(mail.sendPasswordResetOtp).not.toHaveBeenCalled();
  });

  it('verifies the reset OTP and returns a short-lived reset grant', async () => {
    const { svc, users, otp, jwt } = deps();
    const user = await baseUser();
    users.findByEmail.mockResolvedValue(user);
    jwt.verify.mockReturnValue({
      email: user.email,
      typ: 'password-reset-otp',
    });

    const result = await svc.verifyPasswordResetOtp(
      'forgot.jwt',
      '123456',
    );

    expect(otp.verify).toHaveBeenCalledWith(1, '123456', 'password-reset');
    expect(result).toMatchObject({ resetToken: 'signed.jwt', expiresIn: 900 });
    expect(jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({ sub: 1, typ: 'password-reset' }),
      expect.objectContaining({ expiresIn: '15m' }),
    );
  });

  it('updates the password and makes the reset grant single-use', async () => {
    const { svc, users, jwt } = deps();
    const user = await baseUser();

    jwt.verify.mockReturnValue({
      sub: 1,
      typ: 'password-reset',
      passwordVersion: createHash('sha256')
        .update(user.password_hash)
        .digest('hex'),
    });
    users.findById.mockResolvedValue(user);

    await expect(
      svc.resetPassword('reset.jwt', 'NewPassword123!'),
    ).resolves.toEqual({ ok: true });

    const savedHash = users.updatePassword.mock.calls[0][1];
    expect(await bcrypt.compare('NewPassword123!', savedHash)).toBe(true);
  });

  it('rejects reusing the current password', async () => {
    const { svc, users, jwt } = deps();
    const user = await baseUser();
    jwt.verify.mockReturnValue({
      sub: 1,
      typ: 'password-reset',
      passwordVersion: createHash('sha256')
        .update(user.password_hash)
        .digest('hex'),
    });
    users.findById.mockResolvedValue(user);

    await expect(
      svc.resetPassword('reset.jwt', 'pw123456'),
    ).rejects.toThrow(/khác mật khẩu hiện tại/i);
    expect(users.updatePassword).not.toHaveBeenCalled();
  });

  it('creates a 30-day trusted-browser token after OTP succeeds', async () => {
    const { svc, users, jwt } = deps();
    const user = await baseUser();
    users.findById.mockResolvedValue(user);

    const token = await svc.createTrustedBrowserToken(user.user_id);

    expect(token).toBe('signed.jwt');
    expect(jwt.sign).toHaveBeenCalledWith(
      {
        sub: user.user_id,
        typ: 'trusted-browser',
        passwordVersion: createHash('sha256')
          .update(user.password_hash)
          .digest('hex'),
      },
      expect.objectContaining({ expiresIn: '30d' }),
    );
  });
});

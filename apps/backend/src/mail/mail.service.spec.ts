import * as nodemailer from 'nodemailer';
import { MailService } from './mail.service';

jest.mock('nodemailer');

const createTransport = nodemailer.createTransport as unknown as jest.Mock;

const makeConfig = (env: Record<string, string | undefined>) =>
  ({
    get: (key: string, def?: string) =>
      env[key] !== undefined ? env[key] : def,
  }) as any;

describe('MailService.sendOtp', () => {
  beforeEach(() => createTransport.mockReset());

  it('logs and resolves (no throw) when SMTP is unconfigured in dev', async () => {
    const s = new MailService(makeConfig({})); // NODE_ENV undefined → dev
    await expect(s.sendOtp('a@b.com', '123456', 10)).resolves.toBeUndefined();
    expect(createTransport).not.toHaveBeenCalled();
  });

  it('throws ServiceUnavailable when SMTP is unconfigured in production', async () => {
    const s = new MailService(makeConfig({ NODE_ENV: 'production' }));
    await expect(s.sendOtp('a@b.com', '123456', 10)).rejects.toThrow(
      /chưa được cấu hình/i,
    );
    expect(createTransport).not.toHaveBeenCalled();
  });

  it('builds a transport from env and sends the mail when configured', async () => {
    const sendMail = jest.fn().mockResolvedValue({ messageId: 'x' });
    createTransport.mockReturnValue({ sendMail });

    const s = new MailService(
      makeConfig({
        SMTP_HOST: 'smtp-relay.brevo.com',
        SMTP_PORT: '587',
        SMTP_USER: 'user',
        SMTP_PASS: 'pass',
        MAIL_FROM: 'Manga <no-reply@manga.local>',
      }),
    );

    await s.sendOtp('a@b.com', '654321', 10);

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp-relay.brevo.com',
        port: 587,
        secure: false,
        auth: { user: 'user', pass: 'pass' },
      }),
    );
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'a@b.com',
        from: 'Manga <no-reply@manga.local>',
        subject: expect.stringContaining('654321'),
      }),
    );
  });

  it('maps a transport send failure to ServiceUnavailable', async () => {
    const sendMail = jest.fn().mockRejectedValue(new Error('smtp down'));
    createTransport.mockReturnValue({ sendMail });

    const s = new MailService(
      makeConfig({
        SMTP_HOST: 'smtp-relay.brevo.com',
        SMTP_USER: 'user',
        SMTP_PASS: 'pass',
      }),
    );

    await expect(s.sendOtp('a@b.com', '111111', 10)).rejects.toThrow(
      /không gửi được/i,
    );
  });
});

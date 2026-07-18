import * as bcrypt from 'bcryptjs';
import { OtpService } from './otp.service';

describe('OtpService', () => {
  describe('issue', () => {
    it('invalidates prior live codes, inserts a new hashed code, returns 6 digits', async () => {
      const db: any = {
        query: jest.fn().mockResolvedValue([]),
        insert: jest.fn().mockResolvedValue(1),
      };
      const s = new OtpService(db);
      const code = await s.issue(7, 10);

      expect(code).toMatch(/^\d{6}$/);
      // first call invalidates prior codes
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE `Email_Otp` SET consumed_at = NOW()'),
        [7, 'login'],
      );
      // insert persists a bcrypt hash (not the plaintext) with a SQL-computed expiry
      const [sql, params] = db.insert.mock.calls[0];
      expect(sql).toContain('INSERT INTO `Email_Otp`');
      expect(sql).toContain('DATE_ADD(NOW(), INTERVAL ? MINUTE)');
      expect(params[0]).toBe(7);
      expect(params[1]).not.toBe(code); // hashed
      expect(await bcrypt.compare(code, params[1])).toBe(true);
      expect(params[2]).toBe('login');
      expect(params[3]).toBe(10);
    });
  });

  describe('verify', () => {
    it('consumes the code on a correct guess', async () => {
      const hash = await bcrypt.hash('123456', 10);
      const db: any = {
        queryOne: jest
          .fn()
          .mockResolvedValue({ otp_id: 99, code_hash: hash, attempts: 0 }),
        query: jest.fn().mockResolvedValue([]),
      };
      const s = new OtpService(db);
      await expect(s.verify(7, '123456')).resolves.toBeUndefined();
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('consumed_at = NOW() WHERE otp_id = ?'),
        [99],
      );
    });

    it('increments attempts and throws on a wrong guess', async () => {
      const hash = await bcrypt.hash('123456', 10);
      const db: any = {
        queryOne: jest
          .fn()
          .mockResolvedValue({ otp_id: 99, code_hash: hash, attempts: 1 }),
        query: jest.fn().mockResolvedValue([]),
      };
      const s = new OtpService(db);
      await expect(s.verify(7, '000000')).rejects.toThrow(/không đúng/i);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SET attempts = ? WHERE otp_id = ?'),
        [2, 99],
      );
    });

    it('locks (consumes) the code on the 5th wrong guess', async () => {
      const hash = await bcrypt.hash('123456', 10);
      const db: any = {
        queryOne: jest
          .fn()
          .mockResolvedValue({ otp_id: 99, code_hash: hash, attempts: 4 }),
        query: jest.fn().mockResolvedValue([]),
      };
      const s = new OtpService(db);
      await expect(s.verify(7, '000000')).rejects.toThrow(/quá số lần/i);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SET attempts = ?, consumed_at = NOW()'),
        [5, 99],
      );
    });

    it('throws when no live code exists (expired / never issued)', async () => {
      const db: any = {
        queryOne: jest.fn().mockResolvedValue(null),
        query: jest.fn(),
      };
      const s = new OtpService(db);
      await expect(s.verify(7, '123456')).rejects.toThrow(/hết hạn|không tồn tại/i);
    });
  });

  describe('assertCanResend', () => {
    it('throws 429 while still within the cooldown window', async () => {
      const db: any = {
        queryOne: jest.fn().mockResolvedValue({ age: 12, recent: 1 }),
      };
      const s = new OtpService(db);
      await expect(s.assertCanResend(7, 10)).rejects.toMatchObject({
        status: 429,
      });
    });

    it('throws 429 when too many codes were requested in the window', async () => {
      const db: any = {
        queryOne: jest.fn().mockResolvedValue({ age: 120, recent: 6 }),
      };
      const s = new OtpService(db);
      await expect(s.assertCanResend(7, 10)).rejects.toMatchObject({
        status: 429,
      });
    });

    it('allows a resend after cooldown with few recent codes', async () => {
      const db: any = {
        queryOne: jest.fn().mockResolvedValue({ age: 90, recent: 2 }),
      };
      const s = new OtpService(db);
      await expect(s.assertCanResend(7, 10)).resolves.toBeUndefined();
    });
  });
});

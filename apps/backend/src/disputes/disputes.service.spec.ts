import { DisputesService } from './disputes.service';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { NotificationType, EarningDisputeStatus } from '@manga/shared';

describe('DisputesService', () => {
  describe('file()', () => {
    it('creates a dispute and notifies admins', async () => {
      const db: any = {
        queryOne: jest.fn().mockResolvedValue({
          task_id: 7,
          assignee_user_id: 5,
          task_status: 'APPROVED',
          payment_amount: 100,
        }),
        insert: jest.fn().mockResolvedValue(1),
        query: jest.fn().mockResolvedValue([{ user_id: 9 }]),
      };
      const notifications: any = {
        notify: jest.fn().mockResolvedValue(undefined),
      };
      const service = new DisputesService(db, notifications);

      const result = await service.file(5, {
        taskId: 7,
        reason: 'ít quá',
        expectedAmount: 150,
      });

      // Should query task
      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('SELECT task_id, assignee_user_id, task_status, payment_amount'),
        [7],
      );

      // Should insert dispute
      expect(db.insert).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO `Earning_Dispute`'),
        [5, 7, 'ít quá', 150, EarningDisputeStatus.OPEN],
      );

      // Should query admins
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT user_id FROM `User` WHERE role = ? AND is_activated = 1'),
        ['ADMIN'],
      );

      // Should notify admin 9
      expect(notifications.notify).toHaveBeenCalledWith(
        9,
        NotificationType.DISPUTE,
        'Khiếu nại thu nhập mới',
        'ít quá',
        'Earning_Dispute',
        1,
      );

      // Should find and return the dispute
      expect(db.queryOne).toHaveBeenCalledTimes(2); // One for task check, one for findOne
    });

    it('throws when task not found', async () => {
      const db: any = {
        queryOne: jest.fn().mockResolvedValue(null),
      };
      const notifications: any = {
        notify: jest.fn(),
      };
      const service = new DisputesService(db, notifications);

      await expect(
        service.file(5, { taskId: 7, reason: 'test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws when assistant not assigned to task', async () => {
      const db: any = {
        queryOne: jest.fn().mockResolvedValue({
          task_id: 7,
          assignee_user_id: 99,
          task_status: 'APPROVED',
          payment_amount: 100,
        }),
      };
      const notifications: any = {
        notify: jest.fn(),
      };
      const service = new DisputesService(db, notifications);

      await expect(
        service.file(5, { taskId: 7, reason: 'test' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws when task not approved', async () => {
      const db: any = {
        queryOne: jest.fn().mockResolvedValue({
          task_id: 7,
          assignee_user_id: 5,
          task_status: 'IN_PROGRESS',
          payment_amount: 100,
        }),
      };
      const notifications: any = {
        notify: jest.fn(),
      };
      const service = new DisputesService(db, notifications);

      await expect(
        service.file(5, { taskId: 7, reason: 'test' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resolve()', () => {
    it('resolves dispute with adjusted amount, updates earnings', async () => {
      const db: any = {
        queryOne: jest
          .fn()
          .mockResolvedValueOnce({
            dispute_status: EarningDisputeStatus.OPEN,
            task_id: 7,
            assistant_user_id: 5,
          })
          .mockResolvedValueOnce({
            payment_amount: 100,
          }),
        query: jest.fn().mockResolvedValue([]),
        transaction: jest.fn(async (fn) => fn(db)),
      };
      const notifications: any = {
        notify: jest.fn().mockResolvedValue(undefined),
      };
      const service = new DisputesService(db, notifications);

      const result = await service.resolve(3, 9, {
        status: 'RESOLVED',
        resolutionNote: 'ok',
        adjustedAmount: 150,
      });

      // Should query dispute
      expect(db.queryOne).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('SELECT dispute_status, task_id, assistant_user_id'),
        [3],
      );

      // Should query task payment
      expect(db.queryOne).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('SELECT payment_amount FROM `Task`'),
        [7],
      );

      // Should update task payment
      expect(db.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('UPDATE `Task` SET payment_amount'),
        [150, 7],
      );

      // Should update assistant earnings (delta = 150 - 100 = 50)
      expect(db.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('UPDATE `Assistant_Profile` SET total_earnings'),
        [50, 5],
      );

      // Should update dispute status
      expect(db.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('UPDATE `Earning_Dispute`'),
        [EarningDisputeStatus.RESOLVED, 'ok', 9, 3],
      );

      // Should notify assistant
      expect(notifications.notify).toHaveBeenCalledWith(
        5,
        NotificationType.DISPUTE,
        'Khiếu nại đã được giải quyết',
        'ok',
        'Earning_Dispute',
        3,
      );

      expect(result).toEqual({ ok: true });
    });

    it('rejects dispute without adjusting payment', async () => {
      const db: any = {
        queryOne: jest.fn().mockResolvedValue({
          dispute_status: EarningDisputeStatus.UNDER_REVIEW,
          task_id: 7,
          assistant_user_id: 5,
        }),
        query: jest.fn().mockResolvedValue([]),
        transaction: jest.fn(async (fn) => fn(db)),
      };
      const notifications: any = {
        notify: jest.fn().mockResolvedValue(undefined),
      };
      const service = new DisputesService(db, notifications);

      await service.resolve(3, 9, {
        status: 'REJECTED',
        resolutionNote: 'no basis',
      });

      // Should only have 1 query call (update dispute, no task/earnings updates)
      expect(db.query).toHaveBeenCalledTimes(1);

      // Should update dispute
      expect(db.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('UPDATE `Earning_Dispute`'),
        [EarningDisputeStatus.REJECTED, 'no basis', 9, 3],
      );

      // Should notify assistant
      expect(notifications.notify).toHaveBeenCalledWith(
        5,
        NotificationType.DISPUTE,
        'Khiếu nại bị từ chối',
        'no basis',
        'Earning_Dispute',
        3,
      );
    });

    it('throws when dispute not found', async () => {
      const db: any = {
        queryOne: jest.fn().mockResolvedValue(null),
      };
      const notifications: any = {
        notify: jest.fn(),
      };
      const service = new DisputesService(db, notifications);

      await expect(
        service.resolve(999, 9, {
          status: 'RESOLVED',
          resolutionNote: 'test',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws when invalid state transition', async () => {
      const db: any = {
        queryOne: jest.fn().mockResolvedValue({
          dispute_status: EarningDisputeStatus.RESOLVED,
          task_id: 7,
          assistant_user_id: 5,
        }),
      };
      const notifications: any = {
        notify: jest.fn(),
      };
      const service = new DisputesService(db, notifications);

      // Cannot transition from RESOLVED to REJECTED
      await expect(
        service.resolve(3, 9, {
          status: 'REJECTED',
          resolutionNote: 'test',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('markUnderReview()', () => {
    it('transitions dispute to UNDER_REVIEW', async () => {
      const db: any = {
        queryOne: jest.fn().mockResolvedValue({
          dispute_status: EarningDisputeStatus.OPEN,
        }),
        query: jest.fn().mockResolvedValue([]),
      };
      const notifications: any = {
        notify: jest.fn(),
      };
      const service = new DisputesService(db, notifications);

      const result = await service.markUnderReview(3, 9);

      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('SELECT dispute_status'),
        [3],
      );

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE `Earning_Dispute` SET dispute_status'),
        [EarningDisputeStatus.UNDER_REVIEW, 3],
      );

      expect(result).toEqual({ ok: true });
    });

    it('throws when dispute not found', async () => {
      const db: any = {
        queryOne: jest.fn().mockResolvedValue(null),
      };
      const notifications: any = {
        notify: jest.fn(),
      };
      const service = new DisputesService(db, notifications);

      await expect(service.markUnderReview(999, 9)).rejects.toThrow(NotFoundException);
    });

    it('throws when invalid state transition', async () => {
      const db: any = {
        queryOne: jest.fn().mockResolvedValue({
          dispute_status: EarningDisputeStatus.RESOLVED,
        }),
      };
      const notifications: any = {
        notify: jest.fn(),
      };
      const service = new DisputesService(db, notifications);

      // Cannot transition from RESOLVED to UNDER_REVIEW
      await expect(service.markUnderReview(3, 9)).rejects.toThrow(BadRequestException);
    });
  });
});

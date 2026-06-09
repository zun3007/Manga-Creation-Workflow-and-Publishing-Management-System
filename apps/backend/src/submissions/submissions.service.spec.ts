import { SubmissionsService } from './submissions.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

describe('SubmissionsService', () => {
  describe('review()', () => {
    it('approves a submission and accrues earnings', async () => {
      const db: any = {
        queryOne: jest.fn().mockResolvedValue({
          submission_id: 1,
          submission_status: 'PENDING',
          task_id: 10,
          assistant_user_id: 5,
          assignor_user_id: 3,
          task_status: 'SUBMITTED',
        }),
        query: jest.fn().mockResolvedValue([]),
        transaction: jest.fn(async (fn) => fn(db)),
      };
      const notifications: any = {
        notify: jest.fn().mockResolvedValue(undefined),
      };
      const service = new SubmissionsService(db, notifications);

      await service.review(1, 3, 'APPROVED', 'Good work');

      // Should have 3 db.query calls: update submission, update task, accrue earnings
      expect(db.query).toHaveBeenCalledTimes(3);

      // First call: update submission
      expect(db.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('UPDATE `Submission`'),
        expect.arrayContaining(['APPROVED', 'Good work', 3, 1]),
      );

      // Second call: update task
      expect(db.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('UPDATE `Task`'),
        expect.arrayContaining(['APPROVED', 10]),
      );

      // Third call: accrue earnings
      expect(db.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('UPDATE `Assistant_Profile`'),
        expect.arrayContaining([10, 5]),
      );

      // Should notify assistant
      expect(notifications.notify).toHaveBeenCalledWith(
        5,
        expect.any(String),
        'Bài được duyệt',
        'Good work',
        'Submission',
        1,
      );
    });

    it('requires revision without accruing earnings', async () => {
      const db: any = {
        queryOne: jest.fn().mockResolvedValue({
          submission_id: 1,
          submission_status: 'PENDING',
          task_id: 10,
          assistant_user_id: 5,
          assignor_user_id: 3,
          task_status: 'SUBMITTED',
        }),
        query: jest.fn().mockResolvedValue([]),
        transaction: jest.fn(async (fn) => fn(db)),
      };
      const notifications: any = {
        notify: jest.fn().mockResolvedValue(undefined),
      };
      const service = new SubmissionsService(db, notifications);

      await service.review(1, 3, 'REVISION_REQUIRED', 'Please fix');

      // Should have 2 db.query calls: update submission, update task (NO accrual)
      expect(db.query).toHaveBeenCalledTimes(2);

      // First call: update submission
      expect(db.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('UPDATE `Submission`'),
        expect.arrayContaining(['REVISION_REQUIRED', 'Please fix', 3, 1]),
      );

      // Second call: update task
      expect(db.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('UPDATE `Task`'),
        expect.arrayContaining(['REVISION_REQUIRED', 10]),
      );

      // Should notify assistant
      expect(notifications.notify).toHaveBeenCalledWith(
        5,
        expect.any(String),
        'Cần chỉnh sửa',
        'Please fix',
        'Submission',
        1,
      );
    });

    it('throws when submission not found', async () => {
      const db: any = {
        queryOne: jest.fn().mockResolvedValue(null),
      };
      const notifications: any = {
        notify: jest.fn(),
      };
      const service = new SubmissionsService(db, notifications);

      await expect(service.review(999, 3, 'APPROVED')).rejects.toThrow(NotFoundException);
    });

    it('throws when mangaka does not own the submission', async () => {
      const db: any = {
        queryOne: jest.fn().mockResolvedValue({
          submission_id: 1,
          submission_status: 'PENDING',
          task_id: 10,
          assistant_user_id: 5,
          assignor_user_id: 3,
          task_status: 'SUBMITTED',
        }),
      };
      const notifications: any = {
        notify: jest.fn(),
      };
      const service = new SubmissionsService(db, notifications);

      await expect(service.review(1, 999, 'APPROVED')).rejects.toThrow(ForbiddenException);
    });
  });
});

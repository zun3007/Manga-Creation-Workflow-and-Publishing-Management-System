import { SubmissionsService } from './submissions.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('SubmissionsService', () => {
  describe('review()', () => {
    it('approves a submission, accrues earnings, and completes the page', async () => {
      const db: any = {
        queryOne: jest
          .fn()
          // review() submission lookup
          .mockResolvedValueOnce({
            submission_id: 1,
            submission_status: 'PENDING',
            task_id: 10,
            page_id: 20,
            file_url: 'http://x/sub.png',
            assistant_user_id: 5,
            assignor_user_id: 3,
            task_status: 'SUBMITTED',
          })
          // applying the approved artwork: Page_Version MAX(version_number)+1
          .mockResolvedValueOnce({ next: 2 })
          // syncPageStatusFromTasks current-page lookup
          .mockResolvedValueOnce({ page_status: 'REVIEWING' }),
        query: jest.fn((sql: string) =>
          String(sql).includes('SELECT task_status FROM `Task`')
            ? [{ task_status: 'APPROVED' }] // page's only task is now approved
            : [],
        ),
        transaction: jest.fn((fn) => fn(db)),
      };
      const notifications: any = {
        notify: jest.fn().mockResolvedValue(undefined),
      };
      const service = new SubmissionsService(db, notifications);

      await service.review(1, 3, 'APPROVED', 'Good work');

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

      // Page is reconciled to COMPLETED once all its tasks are approved
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE `Page`'),
        ['COMPLETED', 20],
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

    it('requires revision without accruing earnings and reopens the page', async () => {
      const db: any = {
        queryOne: jest
          .fn()
          // review() submission lookup
          .mockResolvedValueOnce({
            submission_id: 1,
            submission_status: 'PENDING',
            task_id: 10,
            page_id: 20,
            assistant_user_id: 5,
            assignor_user_id: 3,
            task_status: 'SUBMITTED',
          })
          // syncPageStatusFromTasks current-page lookup
          .mockResolvedValueOnce({ page_status: 'REVIEWING' }),
        query: jest.fn((sql: string) =>
          String(sql).includes('SELECT task_status FROM `Task`')
            ? [{ task_status: 'REVISION_REQUIRED' }] // task bounced back
            : [],
        ),
        transaction: jest.fn((fn) => fn(db)),
      };
      const notifications: any = {
        notify: jest.fn().mockResolvedValue(undefined),
      };
      const service = new SubmissionsService(db, notifications);

      await service.review(1, 3, 'REVISION_REQUIRED', 'Please fix');

      // No earnings accrual on revision
      expect(db.query).not.toHaveBeenCalledWith(
        expect.stringContaining('UPDATE `Assistant_Profile`'),
        expect.anything(),
      );

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

      // Page is reopened REVIEWING -> IN_PROGRESS when revision is requested
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE `Page`'),
        ['IN_PROGRESS', 20],
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

      await expect(service.review(999, 3, 'APPROVED')).rejects.toThrow(
        NotFoundException,
      );
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

      await expect(service.review(1, 999, 'APPROVED')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});

import { RankingsService } from './rankings.service';
import { RiskLevel } from '@manga/shared';

describe('RankingsService', () => {
  describe('closePeriod', () => {
    it('closes period, computes HIGH risk, updates series status, and sends notification', async () => {
      const db: any = {
        queryOne: jest
          .fn()
          .mockResolvedValueOnce({
            vote_period_id: 1,
            series_id: 7,
          })
          .mockResolvedValueOnce({
            avg: 2.0,
            n: 3,
          })
          .mockResolvedValueOnce({
            c: 0,
          })
          .mockResolvedValueOnce({
            mangaka_user_id: 42,
          }),
        query: jest.fn().mockResolvedValue([]),
      };

      const notifications: any = {
        notify: jest.fn().mockResolvedValue(undefined),
      };

      const service = new RankingsService(db, notifications);
      const result = await service.closePeriod(1);

      // Verify period loaded
      expect(db.queryOne).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('Vote_Period'),
        [1],
      );

      // Verify average computed
      expect(db.queryOne).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('AVG(score)'),
        [1],
      );

      // Verify rank position computed (c=0 means rank 1)
      expect(db.queryOne).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('Ranking'),
        [2.0],
      );

      // Verify mangaka fetched
      expect(db.queryOne).toHaveBeenNthCalledWith(
        4,
        expect.stringContaining('mangaka_user_id'),
        [7],
      );

      // Verify period closed
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('CLOSED'),
        [1],
      );

      // Verify ranking upserted
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('Ranking'),
        expect.arrayContaining([7, 1, 1, 2.0, RiskLevel.HIGH]),
      );

      // Verify series marked AT_RISK
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('AT_RISK'),
        [7],
      );

      // Verify notification sent
      expect(notifications.notify).toHaveBeenCalledWith(
        42,
        'RISK_ALERT',
        'Series của bạn đang ở mức rủi ro cao',
        expect.stringContaining('2.00'),
        'Series',
        7,
      );

      expect(result).toEqual({
        seriesId: 7,
        total: 2.0,
        risk: RiskLevel.HIGH,
        rankPosition: 1,
      });
    });

    it('computes MEDIUM risk when avg is between 2.5 and 3.5', async () => {
      const db: any = {
        queryOne: jest
          .fn()
          .mockResolvedValueOnce({
            vote_period_id: 2,
            series_id: 8,
          })
          .mockResolvedValueOnce({
            avg: 3.0,
            n: 5,
          })
          .mockResolvedValueOnce({
            c: 2,
          }),
        query: jest.fn().mockResolvedValue([]),
      };

      const notifications: any = {
        notify: jest.fn(),
      };

      const service = new RankingsService(db, notifications);
      const result = await service.closePeriod(2);

      expect(result.risk).toBe(RiskLevel.MEDIUM);
      expect(result.rankPosition).toBe(3);
      // No notification for MEDIUM risk
      expect(notifications.notify).not.toHaveBeenCalled();
    });
  });

  describe('openPeriod', () => {
    it('creates a vote period', async () => {
      const db: any = {
        insert: jest.fn().mockResolvedValue(99),
      };
      const notifications: any = {};

      const service = new RankingsService(db, notifications);
      const result = await service.openPeriod({
        seriesId: 5,
        periodType: 'WEEKLY',
        startDate: '2026-06-01',
        endDate: '2026-06-08',
      });

      expect(db.insert).toHaveBeenCalledWith(
        expect.stringContaining('Vote_Period'),
        [5, 'WEEKLY', '2026-06-01', '2026-06-08'],
      );
      expect(result).toEqual({ id: 99 });
    });
  });

  describe('castVote', () => {
    it('throws BadRequestException if period is closed', async () => {
      const db: any = {
        queryOne: jest.fn().mockResolvedValue(null),
      };
      const notifications: any = {};

      const service = new RankingsService(db, notifications);
      await expect(
        service.castVote(10, {
          votePeriodId: 5,
          score: 4,
          comment: 'Good',
        }),
      ).rejects.toThrow('Kỳ bình chọn đã đóng hoặc không tồn tại');
    });

    it('upserts vote when period is open', async () => {
      const db: any = {
        queryOne: jest
          .fn()
          .mockResolvedValue({ vote_period_id: 5, status: 'OPEN' }),
        query: jest.fn().mockResolvedValue([]),
      };
      const notifications: any = {};

      const service = new RankingsService(db, notifications);
      const result = await service.castVote(10, {
        votePeriodId: 5,
        score: 4,
        comment: 'Good',
      });

      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('Vote'), [
        5,
        10,
        4,
        'Good',
      ]);
      expect(result).toEqual({ ok: true });
    });
  });
});

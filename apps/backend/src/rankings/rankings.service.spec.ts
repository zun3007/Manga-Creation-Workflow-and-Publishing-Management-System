import { RankingsService } from './rankings.service';
import { RiskLevel } from '@manga/shared';

describe('RankingsService', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  describe('openPeriod', () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2026-07-06T00:00:00.000Z'));
    });

    it('rejects a vote period that starts before today', async () => {
      const service = new RankingsService({ insert: jest.fn() } as any, {} as any);

      await expect(
        service.openPeriod({
          seriesId: 5,
          periodType: 'WEEKLY',
          startDate: '2026-07-05',
          endDate: '2026-07-12',
        }),
      ).rejects.toThrow('Ngày mở bình chọn không thể ở quá khứ');
    });

    it('rejects a vote period whose end date is before its start date', async () => {
      const service = new RankingsService({ insert: jest.fn() } as any, {} as any);

      await expect(
        service.openPeriod({
          seriesId: 5,
          periodType: 'WEEKLY',
          startDate: '2026-07-10',
          endDate: '2026-07-09',
        }),
      ).rejects.toThrow('Ngày đóng bình chọn không thể trước ngày mở bình chọn');
    });

    it('creates a vote period when date range is valid', async () => {
      const db: any = {
        queryOne: jest.fn().mockResolvedValue(null),
        insert: jest.fn().mockResolvedValue(99),
      };

      const service = new RankingsService(db, {} as any);
      const result = await service.openPeriod({
        seriesId: 5,
        periodType: 'WEEKLY',
        startDate: '2026-07-06',
        endDate: '2026-07-13',
      });

      expect(db.insert).toHaveBeenCalledWith(
        expect.stringContaining('Vote_Period'),
        [5, 'WEEKLY', '2026-07-06', '2026-07-13'],
      );
      expect(result).toEqual({ id: 99 });
    });

    it('rejects a duplicate series/type/start-date vote period with a friendly message', async () => {
      const db: any = {
        queryOne: jest.fn().mockResolvedValue({ vote_period_id: 11 }),
        insert: jest.fn(),
      };

      const service = new RankingsService(db, {} as any);

      await expect(
        service.openPeriod({
          seriesId: 2,
          periodType: 'WEEKLY',
          startDate: '2026-07-06',
          endDate: '2026-07-28',
        }),
      ).rejects.toThrow(
        'Kỳ bình chọn cho series này, loại kỳ này và ngày mở này đã tồn tại',
      );
      expect(db.insert).not.toHaveBeenCalled();
    });
  });

  describe('castVote', () => {
    it('throws BadRequestException if period is closed', async () => {
      const db: any = {
        queryOne: jest.fn().mockResolvedValue(null),
      };

      const service = new RankingsService(db, {} as any);
      await expect(
        service.castVote(10, {
          votePeriodId: 5,
          score: 4,
          comment: 'Good',
        }),
      ).rejects.toThrow('Kỳ bình chọn đã đóng hoặc không tồn tại');
    });

    it('keeps the period open when not every active board member has voted', async () => {
      const db: any = {
        queryOne: jest
          .fn()
          .mockResolvedValueOnce({ vote_period_id: 5, status: 'OPEN' })
          .mockResolvedValueOnce({ required: 3, received: 2 }),
        query: jest.fn().mockResolvedValue([]),
      };

      const service = new RankingsService(db, {} as any);
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
      expect(db.query).not.toHaveBeenCalledWith(
        expect.stringContaining("SET status='CLOSED'"),
        expect.anything(),
      );
      expect(result).toEqual({
        ok: true,
        closed: false,
        votesReceived: 2,
        votesRequired: 3,
      });
    });

    it('auto-closes and recomputes same-cycle ranks after the last active board vote', async () => {
      const db: any = {
        queryOne: jest
          .fn()
          .mockResolvedValueOnce({ vote_period_id: 5, status: 'OPEN' })
          .mockResolvedValueOnce({ required: 2, received: 2 })
          .mockResolvedValueOnce({
            vote_period_id: 5,
            series_id: 7,
            ranking_period_type: 'WEEKLY',
            period_start_date: '2026-07-06',
            period_end_date: '2026-07-13',
            status: 'OPEN',
          }),
        query: jest.fn((sql: string) => {
          if (sql.includes('AVG(v.score)')) {
            return Promise.resolve([
              { votePeriodId: 5, seriesId: 7, total: 4 },
              { votePeriodId: 6, seriesId: 8, total: 3 },
            ]);
          }
          return Promise.resolve([]);
        }),
      };

      const service = new RankingsService(db, {} as any);
      const result = await service.castVote(11, {
        votePeriodId: 5,
        score: 5,
        comment: 'Excellent',
      });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("SET status='CLOSED'"),
        [5],
      );
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO `Ranking`'),
        [7, 5, 1, 4, RiskLevel.LOW],
      );
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO `Ranking`'),
        [8, 6, 2, 3, RiskLevel.MEDIUM],
      );
      expect(result).toEqual({
        ok: true,
        closed: true,
        votesReceived: 2,
        votesRequired: 2,
        ranking: {
          seriesId: 7,
          total: 4,
          risk: RiskLevel.LOW,
          rankPosition: 1,
        },
      });
    });
  });

  describe('openPeriods', () => {
    it('returns OPEN periods even when they are scheduled for a future start date', async () => {
      const db: any = {
        query: jest.fn().mockResolvedValue([
          {
            id: 9,
            seriesId: 1,
            series: 'Series X',
            periodType: 'WEEKLY',
            startDate: '2999-01-10',
            endDate: '2999-01-17',
            hasVoted: 0,
          },
        ]),
      };

      const service = new RankingsService(db, {} as any);
      const result = await service.openPeriods(10);

      expect(db.query).toHaveBeenCalledWith(
        expect.not.stringContaining('DATE(vp.period_start_date) <= CURRENT_DATE()'),
        [10],
      );
      expect(result).toEqual([
        expect.objectContaining({
          id: 9,
          startDate: '2999-01-10',
        }),
      ]);
    });
  });

  describe('leaderboard', () => {
    it('computes displayed rank from each series latest score instead of stored rank_position', async () => {
      const db: any = {
        query: jest.fn().mockResolvedValue([]),
      };

      const service = new RankingsService(db, {} as any);
      await service.leaderboard();

      const sql = db.query.mock.calls[0][0] as string;
      expect(sql).toContain('RANK() OVER');
      expect(sql).toContain('latest.score DESC');
      expect(sql).not.toContain('r.rank_position AS rankPosition');
    });
  });

  describe('latestReaderVoteRankings', () => {
    it('loads the latest persisted reader import ranking from Reader_Vote_Ranking', async () => {
      const db: any = {
        query: jest.fn().mockResolvedValue([
          {
            seriesId: 3,
            readerRankingId: 9,
            rankPosition: 1,
            seriesTitle: 'The Tenth Panel',
            publicationYear: 2024,
            chapterCount: 2,
            author: 'Nguyen Tien Dung',
            genres: 'Action, Drama',
            averageReaderStars: '4.72',
            sales: '128000000.00',
            riskLevel: RiskLevel.LOW,
            periodType: 'WEEKLY',
            startDate: '2026-07-06',
            endDate: '2026-07-06',
          },
        ]),
      };

      const service = new RankingsService(db, {} as any);
      const result = await service.latestReaderVoteRankings();

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('Reader_Vote_Ranking'),
      );
      expect(result).toEqual({
        importedCount: 1,
        periodType: 'WEEKLY',
        startDate: '2026-07-06',
        endDate: '2026-07-06',
        rankings: [
          expect.objectContaining({
            seriesId: 3,
            rankPosition: 1,
            averageReaderStars: 4.72,
            sales: 128000000,
          }),
        ],
      });
    });
  });

  describe('closePeriod', () => {
    it('does not allow a manual close before all active board members have voted', async () => {
      const db: any = {
        queryOne: jest.fn().mockResolvedValueOnce({ required: 3, received: 1 }),
        query: jest.fn(),
      };

      const service = new RankingsService(db, {} as any);

      await expect(service.closePeriod(1)).rejects.toThrow(
        'Chưa đủ phiếu bình chọn',
      );
      expect(db.query).not.toHaveBeenCalledWith(
        expect.stringContaining("SET status='CLOSED'"),
        expect.anything(),
      );
    });
  });
});

import { EarningsService } from './earnings.service';

describe('EarningsService', () => {
  describe('mine()', () => {
    it('returns total earnings and list of approved tasks', async () => {
      const mockTasks = [
        {
          id: 10,
          description: 'Ink region 1',
          amount: 270,
          series: 'My Manga',
          chapter: 'Chapter 1',
          page: 5,
          regionType: 'INK',
          earnedAt: '2026-05-31T10:00:00Z',
          hasDispute: false,
        },
        {
          id: 11,
          description: 'Color region 2',
          amount: 270,
          series: 'My Manga',
          chapter: 'Chapter 2',
          page: 6,
          regionType: 'COLOR',
          earnedAt: '2026-05-30T15:00:00Z',
          hasDispute: false,
        },
      ];

      const db: any = {
        queryOne: jest.fn().mockResolvedValue({ total: 540 }),
        query: jest.fn().mockResolvedValue(mockTasks),
      };

      const service = new EarningsService(db);
      const result = await service.mine(5);

      expect(result.total).toBe(540);
      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[0].id).toBe(10);
      expect(result.tasks[1].id).toBe(11);

      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COALESCE(total_earnings, 0) AS total'),
        [5],
      );
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM `Task` t'),
        [5],
      );
    });

    it('returns zero earnings when no profile exists', async () => {
      const db: any = {
        queryOne: jest.fn().mockResolvedValue(null),
        query: jest.fn().mockResolvedValue([]),
      };

      const service = new EarningsService(db);
      const result = await service.mine(5);

      expect(result.total).toBe(0);
      expect(result.tasks).toHaveLength(0);
    });

    it('returns empty tasks when no approved tasks exist', async () => {
      const db: any = {
        queryOne: jest.fn().mockResolvedValue({ total: 0 }),
        query: jest.fn().mockResolvedValue([]),
      };

      const service = new EarningsService(db);
      const result = await service.mine(5);

      expect(result.total).toBe(0);
      expect(result.tasks).toHaveLength(0);
    });
  });
});

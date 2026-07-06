import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  describe('series', () => {
    it('uses reader import rankings for mangaka rank and score instead of board rankings', async () => {
      const db: any = {
        query: jest.fn().mockResolvedValue([]),
      };

      const service = new DashboardService(db);
      await service.series(7);

      const sql = db.query.mock.calls[0][0] as string;
      expect(sql).toContain('Reader_Vote_Ranking');
      expect(sql).toContain('reader_star_avg AS score');
      expect(sql).not.toContain('LEFT JOIN `Ranking`');
      expect(sql).not.toContain('total_score AS score');
      expect(db.query).toHaveBeenCalledWith(expect.any(String), [7]);
    });
  });
});

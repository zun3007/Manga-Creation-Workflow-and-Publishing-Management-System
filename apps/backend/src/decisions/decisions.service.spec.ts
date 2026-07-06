import { DecisionsService } from './decisions.service';
import { DecisionType, Frequency, NotificationType } from '@manga/shared';

describe('DecisionsService.decide', () => {
  it('creates a CANCEL decision, updates Series status, and notifies mangaka', async () => {
    const db: any = {
      queryOne: jest
        .fn()
        .mockResolvedValueOnce({
          series_id: 7,
          title: 'Test Series',
          mangaka_user_id: 42,
        })
        .mockResolvedValueOnce({ ranking_id: 3 }),
      insert: jest.fn().mockResolvedValue(101),
      query: jest.fn().mockResolvedValue([]),
    };
    const notifications: any = {
      notify: jest.fn().mockResolvedValue(undefined),
    };

    const service = new DecisionsService(db, notifications);
    const result = await service.decide(9, {
      seriesId: 7,
      decisionType: DecisionType.CANCEL,
      reason: 'low sales',
    });

    // Verify queryOne calls (series, then ranking)
    expect(db.queryOne).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('SELECT series_id, title, mangaka_user_id'),
      [7],
    );
    expect(db.queryOne).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('SELECT ranking_id FROM `Ranking`'),
      [7],
    );

    // Verify INSERT into Decision
    expect(db.insert).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO `Decision`'),
      [7, 3, DecisionType.CANCEL, null, 'low sales', 9],
    );

    // Verify UPDATE Series status to CANCELLED
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE `Series` SET series_status'),
      expect.arrayContaining([DecisionType.CANCEL === DecisionType.CANCEL ? 'CANCELLED' : undefined, 7]),
    );

    // Verify notify
    expect(notifications.notify).toHaveBeenCalledWith(
      42,
      NotificationType.DECISION,
      expect.stringContaining('Test Series'),
      expect.stringContaining('Lý do series dừng lại: low sales'),
      'Series',
      7,
    );

    expect(result).toEqual({ ok: true });
  });

  it('creates a CHANGE_FREQUENCY decision and updates publication_frequency', async () => {
    const db: any = {
      queryOne: jest
        .fn()
        .mockResolvedValueOnce({
          series_id: 5,
          title: 'Another Series',
          mangaka_user_id: 99,
        })
        .mockResolvedValueOnce(null),
      insert: jest.fn().mockResolvedValue(102),
      query: jest.fn().mockResolvedValue([]),
    };
    const notifications: any = {
      notify: jest.fn().mockResolvedValue(undefined),
    };

    const service = new DecisionsService(db, notifications);
    const result = await service.decide(9, {
      seriesId: 5,
      decisionType: DecisionType.CHANGE_FREQUENCY,
      newFrequency: Frequency.MONTHLY,
      reason: 'artist request',
    });

    // Verify INSERT with null ranking_id
    expect(db.insert).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO `Decision`'),
      [5, null, DecisionType.CHANGE_FREQUENCY, Frequency.MONTHLY, 'artist request', 9],
    );

    // Verify UPDATE Series with new frequency
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE `Series` SET publication_frequency'),
      [Frequency.MONTHLY, 5],
    );

    expect(result).toEqual({ ok: true });
  });

  it('throws BadRequestException when CHANGE_FREQUENCY without newFrequency', async () => {
    const db: any = {
      queryOne: jest
        .fn()
        .mockResolvedValueOnce({
          series_id: 5,
          title: 'Series',
          mangaka_user_id: 99,
        }),
      insert: jest.fn(),
      query: jest.fn(),
    };
    const notifications: any = {
      notify: jest.fn(),
    };

    const service = new DecisionsService(db, notifications);

    await expect(
      service.decide(9, {
        seriesId: 5,
        decisionType: DecisionType.CHANGE_FREQUENCY,
        reason: 'test',
      }),
    ).rejects.toThrow('Cần chọn tần suất mới');
  });

  it('throws NotFoundException when series does not exist', async () => {
    const db: any = {
      queryOne: jest.fn().mockResolvedValueOnce(null),
      insert: jest.fn(),
      query: jest.fn(),
    };
    const notifications: any = {
      notify: jest.fn(),
    };

    const service = new DecisionsService(db, notifications);

    await expect(
      service.decide(9, {
        seriesId: 999,
        decisionType: DecisionType.CONTINUE,
        reason: 'test',
      }),
    ).rejects.toThrow('Series not found');
  });
});

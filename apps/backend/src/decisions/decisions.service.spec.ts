import { DecisionsService } from './decisions.service';
import {
  DecisionType,
  Frequency,
  NotificationType,
  SeriesStatus,
} from '@manga/shared';

// decide() now persists the Decision + Series update inside db.transaction(),
// so the mock exposes a tx context and assertions target it.
function makeDb() {
  const tx = {
    insert: jest.fn().mockResolvedValue(101),
    query: jest.fn().mockResolvedValue([]),
    queryOne: jest.fn().mockResolvedValue(null),
  };
  const db: any = {
    queryOne: jest.fn(),
    query: jest.fn().mockResolvedValue([]),
    insert: jest.fn().mockResolvedValue(101),
    transaction: jest.fn().mockImplementation((fn: any) => fn(tx)),
  };
  return { db, tx };
}

describe('DecisionsService.decide', () => {
  it('creates a CANCEL decision, updates Series status, and notifies mangaka', async () => {
    const { db, tx } = makeDb();
    db.queryOne
      .mockResolvedValueOnce({
        series_id: 7,
        title: 'Test Series',
        mangaka_user_id: 42,
        series_status: SeriesStatus.ACTIVE,
      })
      .mockResolvedValueOnce({ ranking_id: 3 });
    const notifications: any = {
      notify: jest.fn().mockResolvedValue(undefined),
    };

    const service = new DecisionsService(db, notifications);
    const result = await service.decide(9, {
      seriesId: 7,
      decisionType: DecisionType.CANCEL,
      reason: 'low sales',
    });

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

    expect(tx.insert).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO `Decision`'),
      [7, 3, DecisionType.CANCEL, null, 'low sales', 9],
    );

    expect(tx.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE `Series` SET series_status'),
      expect.arrayContaining([SeriesStatus.CANCELLED, 7]),
    );

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
    const { db, tx } = makeDb();
    db.queryOne
      .mockResolvedValueOnce({
        series_id: 5,
        title: 'Another Series',
        mangaka_user_id: 99,
        series_status: SeriesStatus.HIATUS,
      })
      .mockResolvedValueOnce(null);
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

    expect(tx.insert).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO `Decision`'),
      [
        5,
        null,
        DecisionType.CHANGE_FREQUENCY,
        Frequency.MONTHLY,
        'artist request',
        9,
      ],
    );

    expect(tx.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE `Series` SET publication_frequency'),
      [Frequency.MONTHLY, SeriesStatus.ACTIVE, 5],
    );

    expect(result).toEqual({ ok: true });
  });

  it('throws BadRequestException when CHANGE_FREQUENCY without newFrequency', async () => {
    const { db } = makeDb();
    db.queryOne.mockResolvedValueOnce({
      series_id: 5,
      title: 'Series',
      mangaka_user_id: 99,
      series_status: SeriesStatus.ACTIVE,
    });
    const notifications: any = { notify: jest.fn() };

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
    const { db } = makeDb();
    db.queryOne.mockResolvedValueOnce(null);
    const notifications: any = { notify: jest.fn() };

    const service = new DecisionsService(db, notifications);

    await expect(
      service.decide(9, {
        seriesId: 999,
        decisionType: DecisionType.CONTINUE,
        reason: 'test',
      }),
    ).rejects.toThrow('Series not found');
  });

  it('rejects a new decision on a terminated (CANCELLED) series', async () => {
    const { db } = makeDb();
    db.queryOne.mockResolvedValueOnce({
      series_id: 7,
      title: 'Dead Series',
      mangaka_user_id: 42,
      series_status: SeriesStatus.CANCELLED,
    });
    const notifications: any = { notify: jest.fn() };

    const service = new DecisionsService(db, notifications);

    await expect(
      service.decide(9, {
        seriesId: 7,
        decisionType: DecisionType.CONTINUE,
        reason: 'revive',
      }),
    ).rejects.toThrow('đã kết thúc');
  });
});

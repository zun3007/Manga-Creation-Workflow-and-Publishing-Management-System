import { SeriesService } from './series.service';
import { NotificationType } from '@manga/shared';

describe('SeriesService', () => {
  it('assignEditor unassigns current editor, inserts new assignment, and notifies', async () => {
    const db: any = {
      queryOne: jest
        .fn()
        .mockResolvedValue({ title: 'My Series', mangaka_user_id: 5 }),
      query: jest.fn().mockResolvedValue([]),
    };
    const notifications: any = {
      notify: jest.fn().mockResolvedValue(undefined),
    };

    const service = new SeriesService(db, notifications);
    const result = await service.assignEditor(5, 9);

    expect(result).toEqual({ ok: true });
    expect(db.queryOne).toHaveBeenCalledWith(
      expect.stringContaining('SELECT title, mangaka_user_id FROM'),
      [5],
    );
    expect(db.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('UPDATE'),
      [5],
    );
    expect(db.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT INTO'),
      [5, 9],
    );
    expect(notifications.notify).toHaveBeenCalledTimes(2);
    expect(notifications.notify).toHaveBeenNthCalledWith(
      1,
      9,
      NotificationType.GENERAL,
      'Bạn được phân công biên tập',
      'Series "My Series"',
      'Series',
      5,
    );
    expect(notifications.notify).toHaveBeenNthCalledWith(
      2,
      5,
      NotificationType.GENERAL,
      'Series "My Series" đã được giao cho biên tập',
      'Series của bạn đã được giao cho một biên tập viên.',
      'Series',
      5,
    );
  });

  it('assignEditor throws NotFoundException if series not found', async () => {
    const db: any = {
      queryOne: jest.fn().mockResolvedValue(null),
    };
    const notifications: any = {
      notify: jest.fn(),
    };

    const service = new SeriesService(db, notifications);
    await expect(service.assignEditor(999, 9)).rejects.toThrow(
      'Series not found',
    );
  });
});

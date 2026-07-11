import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ChapterStatus, SeriesStatus } from '@manga/shared';
import { PublicationScheduleService } from './publication-schedule.service';

describe('PublicationScheduleService', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-06T08:00:00+07:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('create', () => {
    it('creates a schedule for an board-approved chapter in an active series', async () => {
      const db: any = {
        queryOne: jest
          .fn()
          .mockResolvedValueOnce({
            chapter_id: 7,
            chapter_status: ChapterStatus.BOARD_APPROVED,
            series_status: SeriesStatus.ACTIVE,
          })
          .mockResolvedValueOnce(null),
        insert: jest.fn().mockResolvedValue(21),
      };

      const service = new PublicationScheduleService(db);
      const result = await service.create(99, {
        chapterId: 7,
        releaseDate: '2026-07-06',
      });

      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('JOIN `Series`'),
        [7],
      );
      expect(db.insert).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO `Publication_Schedule`'),
        ['2026-07-06 12:00:00', 99, 7],
      );
      expect(result).toEqual({ id: 21 });
    });

    it('rejects release dates before today', async () => {
      const db: any = {
        queryOne: jest.fn(),
        insert: jest.fn(),
      };

      const service = new PublicationScheduleService(db);

      await expect(
        service.create(99, {
          chapterId: 7,
          releaseDate: '2026-07-05',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(db.queryOne).not.toHaveBeenCalled();
      expect(db.insert).not.toHaveBeenCalled();
    });

    it('rejects a chapter that is not board-approved', async () => {
      const db: any = {
        queryOne: jest.fn().mockResolvedValueOnce({
          chapter_id: 7,
          chapter_status: ChapterStatus.DRAFT,
          series_status: SeriesStatus.ACTIVE,
        }),
        insert: jest.fn(),
      };

      const service = new PublicationScheduleService(db);

      await expect(
        service.create(99, {
          chapterId: 7,
          releaseDate: '2026-07-08',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(db.insert).not.toHaveBeenCalled();
    });

    it('rejects chapters from cancelled or hiatus series', async () => {
      const db: any = {
        queryOne: jest.fn().mockResolvedValueOnce({
          chapter_id: 7,
          chapter_status: ChapterStatus.BOARD_APPROVED,
          series_status: SeriesStatus.HIATUS,
        }),
        insert: jest.fn(),
      };

      const service = new PublicationScheduleService(db);

      await expect(
        service.create(99, {
          chapterId: 7,
          releaseDate: '2026-07-08',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(db.insert).not.toHaveBeenCalled();
    });

    it('rejects a chapter that already has an active schedule', async () => {
      const db: any = {
        queryOne: jest
          .fn()
          .mockResolvedValueOnce({
            chapter_id: 7,
            chapter_status: ChapterStatus.BOARD_APPROVED,
            series_status: SeriesStatus.ACTIVE,
          })
          .mockResolvedValueOnce({
            schedule_id: 12,
            publish_status: 'SCHEDULED',
          }),
        insert: jest.fn(),
      };

      const service = new PublicationScheduleService(db);

      await expect(
        service.create(99, {
          chapterId: 7,
          releaseDate: '2026-07-08',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(db.insert).not.toHaveBeenCalled();
    });

    it('reopens a cancelled schedule instead of creating a second active schedule', async () => {
      const db: any = {
        queryOne: jest
          .fn()
          .mockResolvedValueOnce({
            chapter_id: 7,
            chapter_status: ChapterStatus.BOARD_APPROVED,
            series_status: SeriesStatus.ACTIVE,
          })
          .mockResolvedValueOnce({
            schedule_id: 12,
            publish_status: 'CANCELLED',
          }),
        query: jest.fn().mockResolvedValue([]),
        insert: jest.fn(),
      };

      const service = new PublicationScheduleService(db);
      const result = await service.create(99, {
        chapterId: 7,
        releaseDate: '2026-07-08',
      });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("publish_status = 'SCHEDULED'"),
        ['2026-07-08 12:00:00', 99, 12],
      );
      expect(db.insert).not.toHaveBeenCalled();
      expect(result).toEqual({ id: 12 });
    });

    it('throws when the chapter does not exist', async () => {
      const db: any = {
        queryOne: jest.fn().mockResolvedValueOnce(null),
        insert: jest.fn(),
      };

      const service = new PublicationScheduleService(db);

      await expect(
        service.create(99, {
          chapterId: 404,
          releaseDate: '2026-07-08',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  it('lists schedules with schedule action flags', async () => {
    const rows = [
      {
        id: 1,
        chapterId: 7,
        chapterNumber: 3,
        chapterTitle: 'Final Draft',
        seriesId: 5,
        seriesTitle: 'Dragon Hunter',
        releaseDate: '2026-07-08',
        status: 'SCHEDULED',
        canCancel: 1,
        canPublish: 0,
      },
    ];
    const db: any = {
      query: jest.fn().mockResolvedValue(rows),
    };

    const service = new PublicationScheduleService(db);
    const result = await service.list();

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('canPublish'),
    );
    expect(result).toBe(rows);
  });

  it('cancels a future scheduled publication', async () => {
    const db: any = {
      queryOne: jest.fn().mockResolvedValueOnce({
        schedule_id: 12,
        publish_status: 'SCHEDULED',
        release_date: '2026-07-08',
      }),
      query: jest.fn().mockResolvedValue([]),
    };

    const service = new PublicationScheduleService(db);
    const result = await service.cancel(12);

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("publish_status='CANCELLED'"),
      [12],
    );
    expect(result).toEqual({ ok: true });
  });

  it('rejects cancelling a schedule that reached release day', async () => {
    const db: any = {
      queryOne: jest.fn().mockResolvedValueOnce({
        schedule_id: 12,
        publish_status: 'SCHEDULED',
        release_date: '2026-07-06',
      }),
      query: jest.fn(),
    };

    const service = new PublicationScheduleService(db);

    await expect(service.cancel(12)).rejects.toThrow(BadRequestException);
    expect(db.query).not.toHaveBeenCalled();
  });

  it('publishes a schedule when release day has arrived', async () => {
    const db: any = {
      queryOne: jest.fn().mockResolvedValueOnce({
        schedule_id: 12,
        chapter_id: 7,
        publish_status: 'SCHEDULED',
        release_date: '2026-07-06',
        chapter_status: ChapterStatus.BOARD_APPROVED,
      }),
      transaction: jest.fn(async (fn) =>
        fn({
          query: jest.fn().mockResolvedValue([]),
        }),
      ),
    };

    const service = new PublicationScheduleService(db);
    const result = await service.publish(12);

    expect(db.transaction).toHaveBeenCalled();
    expect(result).toEqual({ ok: true });
  });

  it('rejects publishing before release day', async () => {
    const db: any = {
      queryOne: jest.fn().mockResolvedValueOnce({
        schedule_id: 12,
        chapter_id: 7,
        publish_status: 'SCHEDULED',
        release_date: '2026-07-08',
        chapter_status: ChapterStatus.BOARD_APPROVED,
      }),
      transaction: jest.fn(),
    };

    const service = new PublicationScheduleService(db);

    await expect(service.publish(12)).rejects.toThrow(BadRequestException);
    expect(db.transaction).not.toHaveBeenCalled();
  });
});


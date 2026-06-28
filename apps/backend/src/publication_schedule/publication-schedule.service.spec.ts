import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PublicationScheduleService } from './publication-schedule.service';

describe('PublicationScheduleService', () => {
  describe('create', () => {
    it('creates a schedule for an editor-approved chapter', async () => {
      const db: any = {
        queryOne: jest.fn().mockResolvedValueOnce({
          chapter_id: 7,
          chapter_status: 'EDITOR_APPROVED',
        }),
        insert: jest.fn().mockResolvedValue(21),
      };

      const service = new PublicationScheduleService(db);
      const result = await service.create(99, {
        chapterId: 7,
        releaseDate: '2026-07-01',
      });

      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('FROM `Chapter`'),
        [7],
      );
      expect(db.insert).toHaveBeenCalledWith(
        expect.stringContaining('schedule_id = LAST_INSERT_ID(schedule_id)'),
        ['2026-07-01 12:00:00', 99, 7],
      );
      expect(result).toEqual({ id: 21 });
    });

    it('rejects a chapter that is not editor-approved', async () => {
      const db: any = {
        queryOne: jest.fn().mockResolvedValueOnce({
          chapter_id: 7,
          chapter_status: 'DRAFT',
        }),
        insert: jest.fn(),
      };

      const service = new PublicationScheduleService(db);

      await expect(
        service.create(99, {
          chapterId: 7,
          releaseDate: '2026-07-01',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(db.insert).not.toHaveBeenCalled();
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
          releaseDate: '2026-07-01',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  it('lists schedules with series and chapter display data', async () => {
    const rows = [
      {
        id: 1,
        chapterId: 7,
        chapterNumber: 3,
        chapterTitle: 'Final Draft',
        seriesId: 5,
        seriesTitle: 'Dragon Hunter',
        releaseDate: '2026-07-01',
        status: 'SCHEDULED',
      },
    ];
    const db: any = {
      query: jest.fn().mockResolvedValue(rows),
    };

    const service = new PublicationScheduleService(db);
    const result = await service.list();

    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('Publication_Schedule'));
    expect(result).toBe(rows);
  });

  it('cancels a scheduled publication', async () => {
    const db: any = {
      queryOne: jest.fn().mockResolvedValueOnce({
        schedule_id: 12,
        publish_status: 'SCHEDULED',
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
});

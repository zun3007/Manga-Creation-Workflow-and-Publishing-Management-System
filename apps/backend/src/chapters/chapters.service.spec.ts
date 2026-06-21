import { ChaptersService } from './chapters.service';
import { ChapterStatus } from '@manga/shared';

describe('ChaptersService.create', () => {
  const mkCreateDb = () => ({
    queryOne: jest
      .fn()
      .mockResolvedValueOnce({ series_id: 1 }) // ownership check
      .mockResolvedValueOnce({ nextNumber: 3 }) // next chapter number
      .mockResolvedValue({ id: 42, number: 3 }), // findOne
    insert: jest.fn().mockResolvedValue(42),
  });

  it('normalizes a calendar-date deadline to a MySQL DATETIME literal (no trailing Z)', async () => {
    const db: any = mkCreateDb();
    const s = new ChaptersService(db, { notify: jest.fn() } as any);
    await s.create(1, {
      seriesId: 1,
      title: 'Ch 3',
      deadline: '2026-06-20',
    } as any);

    expect(db.insert).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO `Chapter`'),
      expect.arrayContaining(['2026-06-20 12:00:00']),
    );
    // Guard against the regressed value that MySQL 8 strict mode rejects.
    const params = db.insert.mock.calls[0][1] as unknown[];
    expect(params).not.toContain('2026-06-20T00:00:00.000Z');
  });

  it('inserts NULL when no deadline is supplied', async () => {
    const db: any = mkCreateDb();
    const s = new ChaptersService(db, { notify: jest.fn() } as any);
    await s.create(1, { seriesId: 1, title: 'Ch 3' } as any);

    const params = db.insert.mock.calls[0][1] as unknown[];
    expect(params).toContain(null);
  });
});

describe('ChaptersService.editorReview', () => {
  const mkDb = (chapter: any) => ({
    queryOne: jest
      .fn()
      .mockResolvedValueOnce(chapter) // assignment+chapter lookup
      .mockResolvedValue({
        id: chapter?.chapter_id,
        status: 'EDITOR_APPROVED',
      }), // findOne
    query: jest.fn().mockResolvedValue([]),
  });

  it('approves READY_FOR_EDITOR_REVIEW → EDITOR_APPROVED and notifies', async () => {
    const db: any = mkDb({
      chapter_id: 5,
      chapter_status: 'READY_FOR_EDITOR_REVIEW',
      series_id: 1,
      mangaka_user_id: 9,
      title: 'Ch 1',
    });
    const notif: any = { notify: jest.fn().mockResolvedValue(undefined) };
    const s = new ChaptersService(db, notif);
    await s.editorReview(5, 7, 'APPROVE', 'nice');
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE'),
      expect.arrayContaining(['EDITOR_APPROVED', 5]),
    );
    expect(notif.notify).toHaveBeenCalled();
  });

  it('rejects when editor is not assigned to the series', async () => {
    const db: any = {
      queryOne: jest.fn().mockResolvedValue(null),
      query: jest.fn(),
    };
    const s = new ChaptersService(db, { notify: jest.fn() } as any);
    await expect(s.editorReview(5, 7, 'APPROVE')).rejects.toThrow();
  });
});

describe('ChaptersService.setStatus', () => {
  it('transitions EDITOR_APPROVED → PUBLISHED and writes Publication_Schedule', async () => {
    const db: any = {
      queryOne: jest
        .fn()
        .mockResolvedValueOnce({
          chapter_id: 10,
          chapter_status: ChapterStatus.EDITOR_APPROVED,
          series_id: 2,
          mangaka_user_id: 5,
          chapter_title: 'Ch 1',
        }) // ownership lookup
        .mockResolvedValueOnce({ c: 0 }) // incomplete pages count
        .mockResolvedValueOnce({ c: 5 }) // total pages count
        .mockResolvedValue({
          id: 10,
          status: ChapterStatus.PUBLISHED,
        }), // findOne
      query: jest.fn().mockResolvedValue([]),
      transaction: jest.fn((fn) => fn(db)),
    };
    const notif: any = { notify: jest.fn().mockResolvedValue(undefined) };
    const s = new ChaptersService(db, notif);
    await s.setStatus(10, 99, ChapterStatus.PUBLISHED);

    // Verify UPDATE to Chapter table
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE'),
      expect.arrayContaining([ChapterStatus.PUBLISHED, 10]),
    );

    // Verify INSERT to Publication_Schedule
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('Publication_Schedule'),
      expect.arrayContaining([10, 99]),
    );
  });

  it('rejects PUBLISHED when a page is not COMPLETED (e.g. still RAW)', async () => {
    const transaction = jest.fn();
    const db: any = {
      queryOne: jest
        .fn()
        .mockResolvedValueOnce({
          chapter_id: 10,
          chapter_status: ChapterStatus.EDITOR_APPROVED,
          series_id: 2,
          mangaka_user_id: 5,
          chapter_title: 'Ch 1',
        }) // ownership lookup
        .mockResolvedValueOnce({ c: 1 }), // one incomplete (non-COMPLETED) page
      query: jest.fn().mockResolvedValue([]),
      transaction,
    };
    const notif: any = { notify: jest.fn().mockResolvedValue(undefined) };
    const s = new ChaptersService(db, notif);

    await expect(s.setStatus(10, 99, ChapterStatus.PUBLISHED)).rejects.toThrow(
      /Còn trang chưa hoàn thành/,
    );

    // Gate must fail BEFORE any write happens
    expect(transaction).not.toHaveBeenCalled();
    expect(db.query).not.toHaveBeenCalledWith(
      expect.stringContaining('UPDATE'),
      expect.anything(),
    );
  });
});

describe('ChaptersService.editorPages', () => {
  it('returns pages when editor is assigned to the chapter series', async () => {
    const db: any = {
      queryOne: jest.fn().mockResolvedValueOnce({
        chapter_id: 8,
      }), // assignment lookup
      query: jest.fn().mockResolvedValue([
        {
          id: 1,
          number: 1,
          status: 'RAW',
          imageUrl: 'http://example.com/page1.jpg',
        },
        {
          id: 2,
          number: 2,
          status: 'RAW',
          imageUrl: 'http://example.com/page2.jpg',
        },
      ]),
    };
    const s = new ChaptersService(db, {} as any);
    const result = await s.editorPages(8, 5);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(1);
    expect(result[1].id).toBe(2);
  });

  it('rejects with ForbiddenException when editor is not assigned', async () => {
    const db: any = {
      queryOne: jest.fn().mockResolvedValueOnce(null),
      query: jest.fn(),
    };
    const s = new ChaptersService(db, {} as any);
    await expect(s.editorPages(8, 5)).rejects.toThrow();
  });
});

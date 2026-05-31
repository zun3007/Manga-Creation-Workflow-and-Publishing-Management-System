import { ChaptersService } from './chapters.service';

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

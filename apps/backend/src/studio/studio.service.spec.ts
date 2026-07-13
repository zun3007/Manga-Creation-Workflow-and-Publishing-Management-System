import { StudioService } from './studio.service';

describe('StudioService', () => {
  it('savePageVersion bumps the version and updates the page', async () => {
    const db: any = {
      queryOne: jest
        .fn()
        // getPageAccess: mangaka owns the page, chapter still editable
        .mockResolvedValueOnce({
          page_id: 1,
          mangaka_user_id: 7,
          chapter_status: 'IN_PROGRESS',
          assistant_task_count: 0,
          editable_assistant_task_count: 0,
        })
        .mockResolvedValueOnce({ current_version: 2 }),
      insert: jest.fn().mockResolvedValue(10),
      query: jest.fn().mockResolvedValue([]),
    };
    const s = new StudioService(db);
    const r = await s.savePageVersion(7, 'MANGAKA' as any, 1, '/uploads/x.png');
    expect(r.versionNumber).toBe(3);
    expect(db.insert).toHaveBeenCalled();
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE'), expect.arrayContaining([3, 1]));
  });

  it('saveDoc rejects a non-owner', async () => {
    const db: any = { queryOne: jest.fn().mockResolvedValue(null) };
    const s = new StudioService(db);
    await expect(s.saveDoc(7, 1, {})).rejects.toThrow();
  });
});

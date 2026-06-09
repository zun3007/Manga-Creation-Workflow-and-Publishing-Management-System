import { StudioService } from './studio.service';

describe('StudioService', () => {
  it('savePageVersion bumps the version and updates the page', async () => {
    const db: any = {
      queryOne: jest.fn().mockResolvedValueOnce({ page_id: 1 }).mockResolvedValueOnce({ current_version: 2 }),
      insert: jest.fn().mockResolvedValue(10),
      query: jest.fn().mockResolvedValue([]),
    };
    const s = new StudioService(db);
    const r = await s.savePageVersion(7, 1, '/uploads/x.png');
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

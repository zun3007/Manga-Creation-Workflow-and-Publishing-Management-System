import { AdminService } from './admin.service';

describe('AdminService.updateUser', () => {
  it('deactivates a user', async () => {
    const db: any = {
      queryOne: jest
        .fn()
        .mockResolvedValueOnce({ role: 'ASSISTANT', is_activated: 1 })
        .mockResolvedValueOnce(null),
      query: jest.fn().mockResolvedValue([]),
    };
    const s = new AdminService(db);
    await s.updateUser(3, { isActivated: false });
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE'),
      expect.arrayContaining([3]),
    );
  });

  it('refuses to deactivate the last active admin', async () => {
    const db: any = {
      queryOne: jest
        .fn()
        .mockResolvedValueOnce({ role: 'ADMIN', is_activated: 1 })
        .mockResolvedValueOnce({ n: 1 }),
      query: jest.fn(),
    };
    const s = new AdminService(db);
    await expect(s.updateUser(7, { isActivated: false })).rejects.toThrow();
  });

  it('allows deactivating an admin when other admins exist', async () => {
    const db: any = {
      queryOne: jest
        .fn()
        .mockResolvedValueOnce({ role: 'ADMIN', is_activated: 1 })
        .mockResolvedValueOnce({ n: 2 }),
      query: jest.fn().mockResolvedValue([]),
    };
    const s = new AdminService(db);
    await s.updateUser(7, { isActivated: false });
    expect(db.query).toHaveBeenCalled();
  });
});

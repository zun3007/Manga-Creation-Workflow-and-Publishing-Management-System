import { Role } from '@manga/shared';
import { AdminService } from './admin.service';

function createDbMock(tx: any) {
  return {
    transaction: jest.fn(
      async (callback: (transaction: any) => Promise<unknown>) => callback(tx),
    ),
  };
}

describe('AdminService.updateUser', () => {
  it('deactivates a user inside a transaction', async () => {
    const tx = {
      queryOne: jest.fn().mockResolvedValueOnce({
        role: Role.ASSISTANT,
        is_activated: 1,
        full_name: 'Assistant User',
      }),
      query: jest.fn().mockResolvedValue([]),
      insert: jest.fn(),
    };

    const db: any = createDbMock(tx);
    const service = new AdminService(db);

    await service.updateUser(3, {
      isActivated: false,
    });

    expect(db.transaction).toHaveBeenCalledTimes(1);

    expect(tx.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE `User`'),
      [0, 3],
    );
  });

  it('refuses to deactivate the last active admin', async () => {
    const tx = {
      queryOne: jest
        .fn()
        .mockResolvedValueOnce({
          role: Role.ADMIN,
          is_activated: 1,
          full_name: 'Admin User',
        })
        .mockResolvedValueOnce({
          n: 1,
        }),
      query: jest.fn(),
      insert: jest.fn(),
    };

    const db: any = createDbMock(tx);
    const service = new AdminService(db);

    await expect(
      service.updateUser(7, {
        isActivated: false,
      }),
    ).rejects.toThrow('Cannot deactivate/demote the last active admin');

    expect(tx.query).not.toHaveBeenCalled();
  });

  it('allows deactivating an admin when another active admin exists', async () => {
    const tx = {
      queryOne: jest
        .fn()
        .mockResolvedValueOnce({
          role: Role.ADMIN,
          is_activated: 1,
          full_name: 'Admin User',
        })
        .mockResolvedValueOnce({
          n: 2,
        }),
      query: jest.fn().mockResolvedValue([]),
      insert: jest.fn(),
    };

    const db: any = createDbMock(tx);
    const service = new AdminService(db);

    await service.updateUser(7, {
      isActivated: false,
    });

    expect(tx.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE `User`'),
      [0, 7],
    );
  });

  it('allows promoting a user to admin', async () => {
    const tx = {
      queryOne: jest
        .fn()
        .mockResolvedValueOnce({
          role: Role.ASSISTANT,
          is_activated: 1,
          full_name: 'Future Admin',
        })
        .mockResolvedValueOnce({
          tasks: 0,
          submissions: 0,
          disputes: 0,
          earnings: 0,
        }),
      query: jest.fn().mockResolvedValue([]),
      insert: jest.fn(),
    };

    const db: any = createDbMock(tx);
    const service = new AdminService(db);

    await service.updateUser(7, {
      role: Role.ADMIN,
    });

    expect(tx.query).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM `Assistant_Profile`'),
      [7],
    );

    expect(tx.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE `User`'),
      [Role.ADMIN, 7],
    );
  });

  it('refuses to demote the last active admin', async () => {
    const tx = {
      queryOne: jest
        .fn()
        .mockResolvedValueOnce({
          role: Role.ADMIN,
          is_activated: 1,
          full_name: 'Last Admin',
        })
        .mockResolvedValueOnce({
          n: 1,
        }),
      query: jest.fn(),
      insert: jest.fn(),
    };

    const db: any = createDbMock(tx);
    const service = new AdminService(db);

    await expect(
      service.updateUser(7, {
        role: Role.ASSISTANT,
      }),
    ).rejects.toThrow('Cannot deactivate/demote the last active admin');

    expect(tx.query).not.toHaveBeenCalled();
  });

  it('converts the role profile in the same transaction', async () => {
    const tx = {
      queryOne: jest
        .fn()
        .mockResolvedValueOnce({
          role: Role.ASSISTANT,
          is_activated: 1,
          full_name: 'Internal User',
        })
        .mockResolvedValueOnce({
          tasks: 0,
          submissions: 0,
          disputes: 0,
          earnings: 0,
        }),
      query: jest.fn().mockResolvedValue([]),
      insert: jest.fn(),
    };

    const db: any = createDbMock(tx);
    const service = new AdminService(db);

    await service.updateUser(7, {
      role: Role.TANTOU_EDITOR,
    });

    expect(tx.query).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM `Assistant_Profile`'),
      [7],
    );

    expect(tx.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO `Tantou_Editor_Profile`'),
      [7],
    );

    expect(tx.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE `User`'),
      [Role.TANTOU_EDITOR, 7],
    );
  });

  it('rejects role conversion when an assistant has business history', async () => {
    const tx = {
      queryOne: jest
        .fn()
        .mockResolvedValueOnce({
          role: Role.ASSISTANT,
          is_activated: 1,
          full_name: 'Assistant User',
        })
        .mockResolvedValueOnce({
          tasks: 1,
          submissions: 0,
          disputes: 0,
          earnings: 0,
        }),
      query: jest.fn(),
      insert: jest.fn(),
    };

    const db: any = createDbMock(tx);
    const service = new AdminService(db);

    await expect(
      service.updateUser(7, {
        role: Role.TANTOU_EDITOR,
      }),
    ).rejects.toThrow('Assistant đã có task');

    expect(tx.query).not.toHaveBeenCalled();
  });
});

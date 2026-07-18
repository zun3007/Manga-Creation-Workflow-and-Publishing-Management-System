import { TasksService } from './tasks.service';

describe('TasksService.assign deadline validation', () => {
  it('rejects a task deadline in the past before creating the task', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const deadline = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}T00:00:00.000Z`;

    const db = {
      queryOne: jest
        .fn()
        .mockResolvedValueOnce({
          region_id: 12,
          page_id: 5,
          region_type: 'PANEL',
          chapter_deadline: null,
          chapter_status: 'IN_PROGRESS',
        })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          user_id: 9,
          full_name: 'Assistant',
          role: 'ASSISTANT',
          is_activated: 1,
        }),
      insert: jest.fn(),
      query: jest.fn(),
    };
    const notifications = { notify: jest.fn() };
    const service = new TasksService(db as any, notifications as any);

    await expect(
      service.assign(7, {
        regionId: 12,
        assigneeUserId: 9,
        deadline,
      }),
    ).rejects.toThrow(/không được là ngày trong quá khứ/i);

    expect(db.insert).not.toHaveBeenCalled();
    expect(notifications.notify).not.toHaveBeenCalled();
  });
});

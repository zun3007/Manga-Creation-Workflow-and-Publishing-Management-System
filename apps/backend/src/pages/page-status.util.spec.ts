import { TaskStatus, PageStatus } from '@manga/shared';
import { derivePageStatus, syncPageStatusFromTasks } from './page-status.util';

describe('derivePageStatus', () => {
  const T = TaskStatus;
  const P = PageStatus;

  it('returns null when the page has no tasks (mangaka-drawn pages are not task-driven)', () => {
    expect(derivePageStatus([])).toBeNull();
  });

  it('returns COMPLETED only when every task is APPROVED', () => {
    expect(derivePageStatus([T.APPROVED])).toBe(P.COMPLETED);
    expect(derivePageStatus([T.APPROVED, T.APPROVED])).toBe(P.COMPLETED);
  });

  it('returns ASSIGNED when every task is still ASSIGNED', () => {
    expect(derivePageStatus([T.ASSIGNED])).toBe(P.ASSIGNED);
    expect(derivePageStatus([T.ASSIGNED, T.ASSIGNED])).toBe(P.ASSIGNED);
  });

  it('returns REVIEWING when all work is submitted/approved with at least one awaiting review', () => {
    expect(derivePageStatus([T.SUBMITTED])).toBe(P.REVIEWING);
    expect(derivePageStatus([T.SUBMITTED, T.APPROVED])).toBe(P.REVIEWING);
  });

  it('returns IN_PROGRESS for any other mix (active or partial work)', () => {
    expect(derivePageStatus([T.IN_PROGRESS])).toBe(P.IN_PROGRESS);
    expect(derivePageStatus([T.REVISION_REQUIRED])).toBe(P.IN_PROGRESS);
    expect(derivePageStatus([T.SUBMITTED, T.IN_PROGRESS])).toBe(P.IN_PROGRESS);
    expect(derivePageStatus([T.APPROVED, T.ASSIGNED])).toBe(P.IN_PROGRESS);
  });
});

describe('syncPageStatusFromTasks', () => {
  const mkExec = (taskStatuses: string[], current: string) => {
    const query = jest.fn((sql: string) => {
      if (sql.includes('FROM `Task`')) {
        return taskStatuses.map((s) => ({ task_status: s }));
      }
      return [];
    });
    const queryOne = jest.fn(() => ({ page_status: current }));
    return { query, queryOne };
  };

  it('advances RAW -> ASSIGNED on a freshly assigned task', async () => {
    const exec = mkExec([TaskStatus.ASSIGNED], PageStatus.RAW);
    const result = await syncPageStatusFromTasks(exec as any, 7);
    expect(result).toBe(PageStatus.ASSIGNED);
    expect(exec.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE `Page`'),
      [PageStatus.ASSIGNED, 7],
    );
  });

  it('advances REVIEWING -> COMPLETED when all tasks approved', async () => {
    const exec = mkExec([TaskStatus.APPROVED], PageStatus.REVIEWING);
    const result = await syncPageStatusFromTasks(exec as any, 7);
    expect(result).toBe(PageStatus.COMPLETED);
    expect(exec.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE `Page`'),
      [PageStatus.COMPLETED, 7],
    );
  });

  it('does NOT illegally downgrade (IN_PROGRESS page, all tasks ASSIGNED -> no write)', async () => {
    const exec = mkExec([TaskStatus.ASSIGNED], PageStatus.IN_PROGRESS);
    const result = await syncPageStatusFromTasks(exec as any, 7);
    expect(result).toBeNull();
    const updateCalls = exec.query.mock.calls.filter((c: any[]) =>
      String(c[0]).includes('UPDATE `Page`'),
    );
    expect(updateCalls).toHaveLength(0);
  });

  it('does NOT reopen a COMPLETED (terminal) page', async () => {
    const exec = mkExec(
      [TaskStatus.APPROVED, TaskStatus.ASSIGNED],
      PageStatus.COMPLETED,
    );
    const result = await syncPageStatusFromTasks(exec as any, 7);
    expect(result).toBeNull();
  });

  it('is a no-op when the derived status equals the current status', async () => {
    const exec = mkExec([TaskStatus.IN_PROGRESS], PageStatus.IN_PROGRESS);
    const result = await syncPageStatusFromTasks(exec as any, 7);
    expect(result).toBe(PageStatus.IN_PROGRESS);
    const updateCalls = exec.query.mock.calls.filter((c: any[]) =>
      String(c[0]).includes('UPDATE `Page`'),
    );
    expect(updateCalls).toHaveLength(0);
  });
});

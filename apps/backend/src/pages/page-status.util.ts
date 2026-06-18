import {
  PageStatus,
  TaskStatus,
  PAGE_TRANSITIONS,
  canTransition,
} from '@manga/shared';

/**
 * Minimal DB surface needed to sync a page's status. Satisfied by both
 * {@link DbService} and the transaction context handed to `db.transaction()`,
 * so the same helper can run standalone or inside an existing transaction.
 */
export interface PageStatusExecutor {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  queryOne<T = any>(sql: string, params?: any[]): Promise<T | null>;
}

/**
 * Project a page's status from the statuses of the tasks attached to it.
 *
 * A page carries one task per assigned region; the page's status reflects the
 * aggregate progress of that work:
 *   - no tasks                              -> null (leave untouched; mangaka-drawn
 *                                              pages advance via the studio flow)
 *   - every task APPROVED                   -> COMPLETED
 *   - every task still ASSIGNED             -> ASSIGNED
 *   - all SUBMITTED/APPROVED, >=1 SUBMITTED -> REVIEWING (work awaiting review)
 *   - any other mix                         -> IN_PROGRESS (active / partial work)
 *
 * Returns the derived status, or null when there is nothing to derive.
 */
export function derivePageStatus(
  taskStatuses: TaskStatus[],
): PageStatus | null {
  if (taskStatuses.length === 0) return null;

  const every = (pred: (s: TaskStatus) => boolean) =>
    taskStatuses.every(pred);
  const some = (pred: (s: TaskStatus) => boolean) => taskStatuses.some(pred);

  if (every((s) => s === TaskStatus.APPROVED)) return PageStatus.COMPLETED;
  if (every((s) => s === TaskStatus.ASSIGNED)) return PageStatus.ASSIGNED;
  if (
    every((s) => s === TaskStatus.SUBMITTED || s === TaskStatus.APPROVED) &&
    some((s) => s === TaskStatus.SUBMITTED)
  ) {
    return PageStatus.REVIEWING;
  }
  return PageStatus.IN_PROGRESS;
}

/**
 * Recompute a page's status from its tasks and persist it, but only when the
 * move is a legal forward (or REVIEWING->IN_PROGRESS revision) step per
 * {@link PAGE_TRANSITIONS}. This guards against illegal downgrades (e.g. a page
 * already IN_PROGRESS being knocked back to ASSIGNED) and never reopens a
 * terminal COMPLETED page.
 *
 * Call after any task/submission state change that affects a page. Returns the
 * page's status after the call (the new status if updated, the current status
 * if already correct), or null when nothing was changed.
 */
export async function syncPageStatusFromTasks(
  exec: PageStatusExecutor,
  pageId: number,
): Promise<PageStatus | null> {
  const rows = await exec.query<{ task_status: TaskStatus }>(
    'SELECT task_status FROM `Task` WHERE page_id = ?',
    [pageId],
  );

  const target = derivePageStatus(rows.map((r) => r.task_status));
  if (!target) return null;

  const page = await exec.queryOne<{ page_status: PageStatus }>(
    'SELECT page_status FROM `Page` WHERE page_id = ?',
    [pageId],
  );
  const current = page?.page_status;
  if (!current) return null;
  if (current === target) return target;
  if (!canTransition(PAGE_TRANSITIONS, current, target)) return null;

  await exec.query('UPDATE `Page` SET page_status = ? WHERE page_id = ?', [
    target,
    pageId,
  ]);
  return target;
}

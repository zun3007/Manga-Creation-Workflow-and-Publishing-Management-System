import { TaskStatus } from "@manga/shared";
import type { TaskItem } from "../../types";
import { Stamp } from "../ui/Stamp";

interface TaskKanbanProps {
  tasks: TaskItem[];
  /** Optional click handler (e.g. open a task). */
  onCardClick?: (task: TaskItem) => void;
}

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: TaskStatus.ASSIGNED, label: "Được giao" },
  { status: TaskStatus.IN_PROGRESS, label: "Đang làm" },
  { status: TaskStatus.SUBMITTED, label: "Chờ duyệt" },
  { status: TaskStatus.REVISION_REQUIRED, label: "Cần sửa" },
  { status: TaskStatus.APPROVED, label: "Hoàn thành" },
];

const vnd = (v: unknown) => `${Number(v ?? 0).toLocaleString("vi-VN")} ₫`;

/** Read-only Kanban view of tasks grouped by status (S2-F12). */
export function TaskKanban({ tasks, onCardClick }: TaskKanbanProps) {
  const byStatus = (s: TaskStatus) => tasks.filter((t) => t.status === s);

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max gap-4">
        {COLUMNS.map((col) => {
          const items = byStatus(col.status);
          return (
            <section key={col.status} className="flex w-64 shrink-0 flex-col">
              <header className="mb-3 flex items-center justify-between">
                <span className="font-mono text-[0.62rem] uppercase tracking-wider text-ink-soft">
                  {col.label}
                </span>
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-bg px-1.5 font-mono text-[0.6rem] text-ink-soft">
                  {items.length}
                </span>
              </header>

              <div className="flex flex-col gap-2 rounded-[var(--app-radius)] bg-bg/60 p-2">
                {items.length === 0 ? (
                  <p className="px-1 py-6 text-center text-xs text-ink-soft">—</p>
                ) : (
                  items.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={onCardClick ? () => onCardClick(task) : undefined}
                      className={`rounded-[calc(var(--app-radius)*0.7)] border border-line bg-surface p-3 text-left transition ${
                        onCardClick ? "cursor-pointer hover:border-accent/50 hover:brightness-[0.99]" : "cursor-default"
                      }`}
                      style={{ boxShadow: "var(--app-shadow)" }}
                    >
                      <p className="line-clamp-2 text-sm text-ink">
                        {task.description || `Việc #${task.id}`}
                      </p>
                      {(task.series || task.chapter || task.page) && (
                        <p className="mt-1 truncate text-[0.7rem] text-ink-soft">
                          {[task.series, task.chapter, task.page ? `tr.${task.page}` : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        {task.regionType && (
                          <span className="font-mono text-[0.55rem] uppercase tracking-wider text-ink-soft">
                            {task.regionType}
                          </span>
                        )}
                        {task.payment != null && task.payment !== "" && (
                          <span className="font-semibold text-accent text-xs">{vnd(task.payment)}</span>
                        )}
                      </div>
                      <div className="mt-2">
                        <Stamp status={task.status} />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

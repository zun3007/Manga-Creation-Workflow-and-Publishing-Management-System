import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "../layouts/AppLayout";
import { getCreatedTasks } from "../features/tasks/tasks.api";
import type { Task } from "../types/task";
import "./MyCreatedTasksPage.css";

const statusLabels: Record<string, string> = {
  ASSIGNED: "Assigned",
  ACCEPTED: "Accepted",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export function MyCreatedTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [message, setMessage] = useState("Đang tải tasks...");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  async function loadTasks() {
    setMessage("Đang tải tasks...");

    try {
      const data = await getCreatedTasks();

      setTasks(data);
      setMessage("");
    } catch {
      setMessage(
        "Không tải được tasks. Kiểm tra backend /tasks/created-by-me hoặc token đăng nhập.",
      );
    }
  }

  useEffect(() => {
    loadTasks();
  }, []);

  const filteredTasks = useMemo(() => {
    if (statusFilter === "ALL") {
      return tasks;
    }

    return tasks.filter((task) => task.status === statusFilter);
  }, [tasks, statusFilter]);

  const summary = useMemo(() => {
    return {
      total: tasks.length,
      assigned: tasks.filter((task) => task.status === "ASSIGNED").length,
      accepted: tasks.filter((task) => task.status === "ACCEPTED").length,
      submitted: tasks.filter((task) => task.status === "SUBMITTED").length,
    };
  }, [tasks]);

  function formatMoney(value: string | number | null) {
    if (value === null || value === undefined) {
      return "Not set";
    }

    return Number(value).toLocaleString("vi-VN") + "đ";
  }

  function formatDate(value: string | null) {
    if (!value) {
      return "No deadline";
    }

    return new Date(value).toLocaleString("vi-VN");
  }

  return (
    <AppLayout
      title="Tasks Created"
      subtitle="Track assistant tasks assigned from manga page regions."
    >
      <section className="created-tasks-page">
        <div className="task-summary-grid">
          <article className="task-summary-card">
            <span>Total tasks</span>
            <strong>{summary.total.toString().padStart(2, "0")}</strong>
            <p>All tasks you assigned</p>
          </article>

          <article className="task-summary-card">
            <span>Assigned</span>
            <strong>{summary.assigned.toString().padStart(2, "0")}</strong>
            <p>Waiting for assistant</p>
          </article>

          <article className="task-summary-card">
            <span>Accepted</span>
            <strong>{summary.accepted.toString().padStart(2, "0")}</strong>
            <p>Assistant accepted</p>
          </article>

          <article className="task-summary-card">
            <span>Submitted</span>
            <strong>{summary.submitted.toString().padStart(2, "0")}</strong>
            <p>Waiting for review</p>
          </article>
        </div>

        <section className="tasks-toolbar-card">
          <div>
            <span className="v5-kicker">Mangaka task tracking</span>
            <h2>Assigned region tasks</h2>
            <p>
              Follow each task status after assigning manga page regions to
              assistants.
            </p>
          </div>

          <div className="task-filter-group">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="ALL">All status</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>

            <button type="button" onClick={loadTasks}>
              Refresh
            </button>
          </div>
        </section>

        {message && (
          <section className="tasks-message-card">
            <p>{message}</p>
          </section>
        )}

        <section className="created-task-list">
          {filteredTasks.length === 0 && !message && (
            <article className="tasks-message-card">
              <p>Chưa có task nào theo bộ lọc hiện tại.</p>
            </article>
          )}

          {filteredTasks.map((task) => (
            <article key={task.id} className="created-task-card">
              <div className="task-card-main">
                <div className="task-card-heading">
                  <div>
                    <span className="task-id">TASK #{task.id}</span>
                    <h3>{task.description}</h3>
                  </div>

                  <div className="task-heading-actions">
                    <span className={`task-status status-${task.status}`}>
                      {statusLabels[task.status] ?? task.status}
                    </span>

                    <button type="button" onClick={() => setSelectedTask(task)}>
                      View Detail
                    </button>
                  </div>

                  <span className={`task-status status-${task.status}`}>
                    {statusLabels[task.status] ?? task.status}
                  </span>
                </div>

                <p className="task-instruction">
                  {task.instruction || "No instruction provided."}
                </p>

                <div className="task-meta-grid">
                  <div>
                    <span>Region</span>
                    <strong>
                      #{task.regionId}
                      {task.region?.type ? ` · ${task.region.type}` : ""}
                    </strong>
                  </div>

                  <div>
                    <span>Assistant</span>
                    <strong>
                      {task.assignee?.displayName ??
                        `User #${task.assigneeUserId}`}
                    </strong>
                  </div>

                  <div>
                    <span>Deadline</span>
                    <strong>{formatDate(task.deadline)}</strong>
                  </div>

                  <div>
                    <span>Payment</span>
                    <strong>{formatMoney(task.paymentAmount)}</strong>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      </section>

      {selectedTask && (
        <div className="task-detail-backdrop">
          <section className="task-detail-modal">
            <header className="task-detail-header">
              <div>
                <span className="v5-kicker">Task detail</span>
                <h2>TASK #{selectedTask.id}</h2>
                <p>{selectedTask.description}</p>
              </div>

              <button type="button" onClick={() => setSelectedTask(null)}>
                ×
              </button>
            </header>

            <div className="task-detail-status-row">
              <span className={`task-status status-${selectedTask.status}`}>
                {statusLabels[selectedTask.status] ?? selectedTask.status}
              </span>

              <strong>{formatMoney(selectedTask.paymentAmount)}</strong>
            </div>

            <div className="task-detail-grid">
              <article>
                <span>Assistant</span>
                <strong>
                  {selectedTask.assignee?.displayName ??
                    `User #${selectedTask.assigneeUserId}`}
                </strong>
                <p>{selectedTask.assignee?.email ?? "No email"}</p>
              </article>

              <article>
                <span>Region</span>
                <strong>
                  #{selectedTask.regionId}
                  {selectedTask.region?.type
                    ? ` · ${selectedTask.region.type}`
                    : ""}
                </strong>
                <p>
                  {selectedTask.region
                    ? `x=${String(selectedTask.region.xCoordinate)} · y=${String(
                        selectedTask.region.yCoordinate,
                      )} · w=${String(selectedTask.region.width)} · h=${String(
                        selectedTask.region.height,
                      )}`
                    : "No region detail"}
                </p>
              </article>

              <article>
                <span>Deadline</span>
                <strong>{formatDate(selectedTask.deadline)}</strong>
                <p>Assistant should submit before this time.</p>
              </article>

              <article>
                <span>Created at</span>
                <strong>
                  {new Date(selectedTask.createdAt).toLocaleString("vi-VN")}
                </strong>
                <p>Task creation time.</p>
              </article>
            </div>

            <section className="task-detail-instruction">
              <span>Instruction</span>
              <p>{selectedTask.instruction || "No instruction provided."}</p>
            </section>

            <footer className="task-detail-footer">
              <button type="button" onClick={() => setSelectedTask(null)}>
                Close
              </button>
            </footer>
          </section>
        </div>
      )}
    </AppLayout>
  );
}

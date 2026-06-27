import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { getEditorProductionOverview } from "../features/tasks/tasks.api";
import type { EditorProductionOverview } from "../types/task";
import "./EditorProductionPage.css";

const statusLabels: Record<string, string> = {
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  REVISION_REQUESTED: "Revision Requested",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export function EditorProductionPage() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState<EditorProductionOverview | null>(
    null,
  );
  const [message, setMessage] = useState("Đang tải production overview...");

  async function loadOverview() {
    setMessage("Đang tải production overview...");

    try {
      const data = await getEditorProductionOverview();

      setOverview(data);
      setMessage("");
    } catch {
      setMessage(
        "Không tải được production overview. Kiểm tra backend /tasks/editor/production-overview.",
      );
    }
  }

  useEffect(() => {
    loadOverview();
  }, []);

  function formatMoney(value: string | number | null | undefined) {
    return Number(value ?? 0).toLocaleString("vi-VN") + "đ";
  }

  function formatDate(value: string | null) {
    if (!value) {
      return "No deadline";
    }

    return new Date(value).toLocaleString("vi-VN");
  }

  return (
    <AppLayout
      title="Production Overview"
      subtitle="Monitor manga production tasks, assistant submissions and review progress."
    >
      <section className="editor-production-page">
        {!overview && (
          <section className="editor-message-card">
            <p>{message}</p>
          </section>
        )}

        {overview && (
          <>
            <div className="editor-summary-grid">
              <article className="editor-summary-card highlight">
                <span>Total tasks</span>
                <strong>
                  {overview.summary.totalTasks.toString().padStart(2, "0")}
                </strong>
                <p>All assistant production tasks</p>
              </article>

              <article className="editor-summary-card">
                <span>In progress</span>
                <strong>
                  {overview.summary.inProgressTasks.toString().padStart(2, "0")}
                </strong>
                <p>Currently being worked on</p>
              </article>

              <article className="editor-summary-card">
                <span>Waiting review</span>
                <strong>
                  {overview.summary.waitingReviewSubmissions
                    .toString()
                    .padStart(2, "0")}
                </strong>
                <p>Submitted work needing review</p>
              </article>

              <article className="editor-summary-card">
                <span>Approved</span>
                <strong>
                  {overview.summary.approvedTasks.toString().padStart(2, "0")}
                </strong>
                <p>Completed and approved tasks</p>
              </article>
            </div>

            <section className="editor-toolbar-card">
              <div>
                <span className="v5-kicker">Tantou editor</span>
                <h2>Production health</h2>
                <p>
                  Track task status, review bottlenecks and assistant work
                  across the manga production workflow.
                </p>
              </div>

              <button type="button" onClick={loadOverview}>
                Refresh
              </button>
            </section>

            {message && (
              <section className="editor-message-card">
                <p>{message}</p>
              </section>
            )}

            <section className="editor-content-grid">
              <section className="editor-panel">
                <div className="editor-panel-header">
                  <span className="v5-kicker">Task pipeline</span>
                  <h2>Latest tasks</h2>
                </div>

                <div className="editor-task-list">
                  {overview.latestTasks.length === 0 && (
                    <p className="editor-empty-text">No task found.</p>
                  )}

                  {overview.latestTasks.map((task) => (
                    <article key={task.id} className="editor-task-card">
                      <div className="editor-task-main">
                        <span>TASK #{task.id}</span>
                        <h3>{task.description}</h3>
                        <p>
                          Assistant:{" "}
                          <strong>
                            {task.assignee?.displayName ?? "Unassigned"}
                          </strong>
                        </p>
                      </div>

                      <div className="editor-task-meta">
                        <div>
                          <span>Page</span>
                          <strong>
                            {task.page
                              ? `Page ${task.page.pageNumber}`
                              : "No page"}
                          </strong>
                        </div>

                        <div>
                          <span>Region</span>
                          <strong>{task.region?.type ?? "No region"}</strong>
                        </div>

                        <div>
                          <span>Payment</span>
                          <strong>{formatMoney(task.paymentAmount)}</strong>
                        </div>

                        <div>
                          <span>Deadline</span>
                          <strong>{formatDate(task.deadline)}</strong>
                        </div>
                      </div>

                      <span className={`editor-status status-${task.status}`}>
                        {statusLabels[task.status] ?? task.status}
                      </span>
                    </article>
                  ))}
                </div>
              </section>

              <aside className="editor-panel">
                <div className="editor-panel-header">
                  <span className="v5-kicker">Review queue</span>
                  <h2>Latest submissions</h2>
                </div>

                <div className="editor-submission-list">
                  {overview.latestSubmissions.length === 0 && (
                    <p className="editor-empty-text">No submission found.</p>
                  )}

                  {overview.latestSubmissions.map((submission) => (
                    <article
                      key={submission.id}
                      className="editor-submission-card"
                    >
                      <div>
                        <span>SUBMISSION #{submission.id}</span>
                        <h3>
                          {submission.task?.description ??
                            `Task #${submission.taskId}`}
                        </h3>
                        <p>
                          {submission.assistant?.displayName ??
                            `User #${submission.assistantUserId}`}
                        </p>
                      </div>

                      <div className="editor-submission-actions">
                        <span
                          className={`editor-status status-${submission.status}`}
                        >
                          {statusLabels[submission.status] ?? submission.status}
                        </span>

                        <button
                          type="button"
                          onClick={() => navigate("/editor/review")}
                        >
                          Open Review
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </aside>
            </section>
          </>
        )}
      </section>
    </AppLayout>
  );
}

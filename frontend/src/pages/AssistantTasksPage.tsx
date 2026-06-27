import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "../layouts/AppLayout";
import {
  acceptTask,
  getAssignedTasks,
  submitTask,
} from "../features/tasks/tasks.api";
import type { Task } from "../types/task";
import "./AssistantTasksPage.css";
import { DrawingWorkspace } from "../features/pages/DrawingWorkspace";

const statusLabels: Record<string, string> = {
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  REVISION_REQUESTED: "Revision Requested",
  CANCELLED: "Cancelled",
};

export function AssistantTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [submissionUrl, setSubmissionUrl] = useState("");
  const [submissionFeedback, setSubmissionFeedback] = useState("");
  const [drawingTask, setDrawingTask] = useState<Task | null>(null);
  const [drawingImageData, setDrawingImageData] = useState("");
  const [message, setMessage] = useState("Đang tải tasks...");

  async function loadTasks() {
    setMessage("Đang tải tasks...");

    try {
      const data = await getAssignedTasks();

      setTasks(data);
      setMessage("");
    } catch {
      setMessage(
        "Không tải được assigned tasks. Kiểm tra backend /tasks/assigned-to-me hoặc token đăng nhập.",
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

  function canWorkOnTask(status: string) {
    return (
      status === "ASSIGNED" ||
      status === "IN_PROGRESS" ||
      status === "REVISION_REQUESTED"
    );
  }

  function getDrawingButtonLabel(status: string) {
    if (status === "REVISION_REQUESTED") {
      return "Revise Drawing";
    }

    return "Open Drawing";
  }

  function getSubmitButtonLabel(status: string) {
    if (status === "REVISION_REQUESTED") {
      return "Submit Revision";
    }

    return "Submit URL";
  }

  async function handleAcceptTask(task: Task) {
    setMessage("Đang nhận task...");

    try {
      await acceptTask(task.id);
      setMessage("Đã nhận task thành công.");
      await loadTasks();
    } catch {
      setMessage("Nhận task thất bại. Kiểm tra backend /tasks/:id/accept.");
    }
  }

  function openDrawingWorkspace(task: Task) {
    const latestPageImage =
      task.page?.versions?.[0]?.imageUrl || "/demo-pages/manga-page-blank.svg";

    setDrawingTask(task);
    setDrawingImageData(latestPageImage);
  }

  async function handleSubmitDrawingWork(imageData: string) {
    if (!drawingTask) {
      return;
    }

    setMessage("Đang submit bản vẽ...");

    try {
      await submitTask(drawingTask.id, {
        fileUrl: imageData,
        feedback:
          drawingTask.status === "REVISION_REQUESTED"
            ? "Revision submitted from MangaFlow Drawing Workspace."
            : "Submitted from MangaFlow Drawing Workspace.",
      });

      setDrawingTask(null);
      setDrawingImageData("");
      setMessage("Submit bản vẽ thành công.");
      await loadTasks();
    } catch {
      setMessage(
        "Submit bản vẽ thất bại. Kiểm tra backend /tasks/:id/submissions.",
      );
    }
  }

  function openSubmitModal(task: Task) {
    setSelectedTask(task);
    setSubmissionUrl("");
    setSubmissionFeedback("");
  }

  async function handleSubmitTask(event: React.FormEvent) {
    event.preventDefault();

    if (!selectedTask) {
      return;
    }

    if (!submissionUrl.trim()) {
      setMessage("Vui lòng nhập file URL.");
      return;
    }

    setMessage("Đang submit bài làm...");

    try {
      await submitTask(selectedTask.id, {
        fileUrl: submissionUrl,
        feedback: submissionFeedback || undefined,
      });

      setSelectedTask(null);
      setSubmissionUrl("");
      setSubmissionFeedback("");
      setMessage("Submit bài làm thành công.");
      await loadTasks();
    } catch {
      setMessage("Submit thất bại. Kiểm tra backend /tasks/:id/submissions.");
    }
  }

  return (
    <AppLayout
      title="Assistant Task Board"
      subtitle="View assigned manga region tasks, accept work and submit completed results."
    >
      <section className="assistant-tasks-page">
        <div className="assistant-summary-grid">
          <article className="assistant-summary-card">
            <span>Total tasks</span>
            <strong>{summary.total.toString().padStart(2, "0")}</strong>
            <p>All tasks assigned to you</p>
          </article>

          <article className="assistant-summary-card">
            <span>Assigned</span>
            <strong>{summary.assigned.toString().padStart(2, "0")}</strong>
            <p>Waiting for acceptance</p>
          </article>

          <article className="assistant-summary-card">
            <span>Accepted</span>
            <strong>{summary.accepted.toString().padStart(2, "0")}</strong>
            <p>Currently in progress</p>
          </article>

          <article className="assistant-summary-card">
            <span>Submitted</span>
            <strong>{summary.submitted.toString().padStart(2, "0")}</strong>
            <p>Waiting for review</p>
          </article>
        </div>

        <section className="assistant-toolbar-card">
          <div>
            <span className="v5-kicker">Assistant workspace</span>
            <h2>My assigned tasks</h2>
            <p>
              Accept assigned region tasks, follow instructions and submit your
              finished work.
            </p>
          </div>

          <div className="assistant-filter-group">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="ALL">All status</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="REVISION_REQUESTED">Revision Requested</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>

            <button type="button" onClick={loadTasks}>
              Refresh
            </button>
          </div>
        </section>

        {message && (
          <section className="assistant-message-card">
            <p>{message}</p>
          </section>
        )}

        <section className="assistant-task-list">
          {filteredTasks.length === 0 && !message && (
            <article className="assistant-message-card">
              <p>Chưa có task nào theo bộ lọc hiện tại.</p>
            </article>
          )}

          {filteredTasks.map((task) => (
            <article key={task.id} className="assistant-task-card">
              <div className="assistant-task-heading">
                <div>
                  <span className="assistant-task-id">TASK #{task.id}</span>
                  <h3>{task.description}</h3>
                </div>

                <span className={`assistant-task-status status-${task.status}`}>
                  {statusLabels[task.status] ?? task.status}
                </span>
              </div>

              <p className="assistant-task-instruction">
                {task.instruction || "No instruction provided."}
              </p>

              <div className="assistant-task-meta-grid">
                <div>
                  <span>Region</span>
                  <strong>
                    #{task.regionId}
                    {task.region?.type ? ` · ${task.region.type}` : ""}
                  </strong>
                </div>

                <div>
                  <span>Page</span>
                  <strong>
                    {task.page
                      ? `Page ${task.page.pageNumber}`
                      : `Page #${task.pageId}`}
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

                <div>
                  <span>Status</span>
                  <strong>{statusLabels[task.status] ?? task.status}</strong>
                </div>
              </div>
              <div className="assistant-task-actions">
                {task.status === "ASSIGNED" && (
                  <button type="button" onClick={() => handleAcceptTask(task)}>
                    Accept Task
                  </button>
                )}

                {canWorkOnTask(task.status) && (
                  <button
                    type="button"
                    onClick={() => openDrawingWorkspace(task)}
                  >
                    {getDrawingButtonLabel(task.status)}
                  </button>
                )}

                {canWorkOnTask(task.status) && (
                  <button type="button" onClick={() => openSubmitModal(task)}>
                    {getSubmitButtonLabel(task.status)}
                  </button>
                )}
              </div>
            </article>
          ))}
        </section>
      </section>
      {selectedTask && (
        <div className="assistant-submit-backdrop">
          <section className="assistant-submit-modal">
            <header className="assistant-submit-header">
              <div>
                <span className="v5-kicker">Submit work</span>
                <h2>TASK #{selectedTask.id}</h2>
                <p>{selectedTask.description}</p>
              </div>

              <button type="button" onClick={() => setSelectedTask(null)}>
                ×
              </button>
            </header>

            <form className="assistant-submit-form" onSubmit={handleSubmitTask}>
              <label>File URL</label>
              <input
                value={submissionUrl}
                onChange={(event) => setSubmissionUrl(event.target.value)}
                placeholder="https://... hoặc data image URL"
              />

              <label>Feedback / Note</label>
              <textarea
                value={submissionFeedback}
                onChange={(event) => setSubmissionFeedback(event.target.value)}
                placeholder="Mô tả phần đã hoàn thành..."
              />

              <div className="assistant-submit-actions">
                <button type="button" onClick={() => setSelectedTask(null)}>
                  Cancel
                </button>

                <button type="submit">Submit Work</button>
              </div>
            </form>
          </section>
        </div>
      )}
      {drawingTask && (
        <DrawingWorkspace
          pageTitle={`Task #${drawingTask.id} · ${drawingTask.description}`}
          imageUrl={drawingImageData || "/demo-pages/manga-page-blank.svg"}
          targetRegion={drawingTask.region ?? null}
          onClose={() => {
            setDrawingTask(null);
            setDrawingImageData("");
          }}
          onApplyDrawing={(imageData) => {
            setDrawingImageData(imageData);
          }}
          onSaveVersion={async (imageData) => {
            await handleSubmitDrawingWork(imageData);
          }}
        />
      )}
      .
    </AppLayout>
  );
}

import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "../layouts/AppLayout";
import { getMySubmissions } from "../features/tasks/tasks.api";
import type { Submission } from "../types/task";
import "./AssistantSubmissionsPage.css";

const submissionLabels: Record<string, string> = {
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  REVISION_REQUESTED: "Revision Requested",
};

export function AssistantSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [message, setMessage] = useState("Đang tải submissions...");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedSubmission, setSelectedSubmission] =
    useState<Submission | null>(null);

  async function loadSubmissions() {
    setMessage("Đang tải submissions...");

    try {
      const data = await getMySubmissions();

      setSubmissions(data);
      setMessage("");
    } catch {
      setMessage(
        "Không tải được submissions. Kiểm tra backend /tasks/my-submissions.",
      );
    }
  }

  useEffect(() => {
    loadSubmissions();
  }, []);

  const filteredSubmissions = useMemo(() => {
    if (statusFilter === "ALL") {
      return submissions;
    }

    return submissions.filter((item) => item.status === statusFilter);
  }, [submissions, statusFilter]);

  const summary = useMemo(() => {
    return {
      total: submissions.length,
      submitted: submissions.filter((item) => item.status === "SUBMITTED")
        .length,
      approved: submissions.filter((item) => item.status === "APPROVED").length,
      revision: submissions.filter(
        (item) => item.status === "REVISION_REQUESTED",
      ).length,
    };
  }, [submissions]);

  function formatDate(value?: string) {
    if (!value) {
      return "No date";
    }

    return new Date(value).toLocaleString("vi-VN");
  }

  function getSubmittedTime(item: Submission) {
    return item.submittedAt ?? item.createdAt;
  }

  return (
    <AppLayout
      title="My Submissions"
      subtitle="Review submitted manga task results and track their review status."
    >
      <section className="assistant-submissions-page">
        <div className="submission-summary-grid">
          <article className="submission-summary-card">
            <span>Total submissions</span>
            <strong>{summary.total.toString().padStart(2, "0")}</strong>
            <p>All submitted work</p>
          </article>

          <article className="submission-summary-card">
            <span>Submitted</span>
            <strong>{summary.submitted.toString().padStart(2, "0")}</strong>
            <p>Waiting for review</p>
          </article>

          <article className="submission-summary-card">
            <span>Approved</span>
            <strong>{summary.approved.toString().padStart(2, "0")}</strong>
            <p>Accepted work</p>
          </article>

          <article className="submission-summary-card">
            <span>Revision</span>
            <strong>{summary.revision.toString().padStart(2, "0")}</strong>
            <p>Need changes</p>
          </article>
        </div>

        <section className="submission-toolbar-card">
          <div>
            <span className="v5-kicker">Assistant submissions</span>
            <h2>Submitted work history</h2>
            <p>
              View every submitted task version and check whether it is waiting
              for review, approved or needs revision.
            </p>
          </div>

          <div className="submission-filter-group">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="ALL">All status</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="APPROVED">Approved</option>
              <option value="REVISION_REQUESTED">Revision Requested</option>
              <option value="REJECTED">Rejected</option>
            </select>

            <button type="button" onClick={loadSubmissions}>
              Refresh
            </button>
          </div>
        </section>

        {message && (
          <section className="submission-message-card">
            <p>{message}</p>
          </section>
        )}

        <section className="submission-list">
          {filteredSubmissions.length === 0 && !message && (
            <article className="submission-message-card">
              <p>Chưa có submission nào theo bộ lọc hiện tại.</p>
            </article>
          )}

          {filteredSubmissions.map((submission) => (
            <article key={submission.id} className="submission-card">
              <div className="submission-card-header">
                <div>
                  <span className="submission-id">
                    SUBMISSION #{submission.id}
                  </span>
                  <h3>
                    {submission.task?.description ??
                      `Task #${submission.taskId}`}
                  </h3>
                </div>

                <span
                  className={`submission-status status-${submission.status}`}
                >
                  {submissionLabels[submission.status] ?? submission.status}
                </span>
              </div>

              <p className="submission-feedback">
                {submission.feedback || "No feedback note."}
              </p>

              <div className="submission-meta-grid">
                <div>
                  <span>Task</span>
                  <strong>#{submission.taskId}</strong>
                </div>

                <div>
                  <span>Version</span>
                  <strong>v{submission.versionNumber}</strong>
                </div>

                <div>
                  <span>Page</span>
                  <strong>
                    {submission.page
                      ? `Page ${submission.page.pageNumber}`
                      : `Page #${submission.pageId}`}
                  </strong>
                </div>

                <div>
                  <span>Submitted at</span>
                  <strong>{formatDate(getSubmittedTime(submission))}</strong>
                </div>
              </div>

              <div className="submission-preview-row">
                <button
                  type="button"
                  onClick={() => setSelectedSubmission(submission)}
                >
                  View Preview
                </button>
              </div>
            </article>
          ))}
        </section>
      </section>

      {selectedSubmission && (
        <div className="submission-preview-backdrop">
          <section className="submission-preview-modal">
            <header className="submission-preview-header">
              <div>
                <span className="v5-kicker">Submission preview</span>
                <h2>Submission #{selectedSubmission.id}</h2>
                <p>
                  {selectedSubmission.task?.description ??
                    `Task #${selectedSubmission.taskId}`}
                </p>
              </div>

              <button type="button" onClick={() => setSelectedSubmission(null)}>
                ×
              </button>
            </header>

            <div className="submission-preview-body">
              <div className="submission-image-frame">
                <img
                  src={selectedSubmission.fileUrl}
                  alt={`Submission ${selectedSubmission.id}`}
                />
              </div>

              <aside className="submission-preview-info">
                <article>
                  <span>Status</span>
                  <strong>
                    {submissionLabels[selectedSubmission.status] ??
                      selectedSubmission.status}
                  </strong>
                </article>

                <article>
                  <span>Version</span>
                  <strong>v{selectedSubmission.versionNumber}</strong>
                </article>

                <article>
                  <span>Page</span>
                  <strong>
                    {selectedSubmission.page
                      ? `Page ${selectedSubmission.page.pageNumber}`
                      : `Page #${selectedSubmission.pageId}`}
                  </strong>
                </article>

                <article>
                  <span>Submitted at</span>
                  <strong>
                    {formatDate(getSubmittedTime(selectedSubmission))}
                  </strong>
                </article>

                <article>
                  <span>Feedback</span>
                  <p>{selectedSubmission.feedback || "No feedback note."}</p>
                </article>
              </aside>
            </div>

            <footer className="submission-preview-footer">
              <button type="button" onClick={() => setSelectedSubmission(null)}>
                Close
              </button>
            </footer>
          </section>
        </div>
      )}
    </AppLayout>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '../layouts/AppLayout';
import {
  approveSubmission,
  getReviewSubmissions,
  requestSubmissionRevision,
} from '../features/tasks/tasks.api';
import type { ReviewSubmission } from '../types/task';
import './ReviewSubmissionsPage.css';

const statusLabels: Record<string, string> = {
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  REVISION_REQUESTED: 'Revision Requested',
};

export function ReviewSubmissionsPage() {
  const [submissions, setSubmissions] = useState<ReviewSubmission[]>([]);
  const [message, setMessage] = useState('Đang tải submissions...');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedSubmission, setSelectedSubmission] =
    useState<ReviewSubmission | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [revisionFeedback, setRevisionFeedback] = useState('');

  async function loadSubmissions() {
    setMessage('Đang tải submissions...');

    try {
      const data = await getReviewSubmissions();

      setSubmissions(data);
      setMessage('');
    } catch {
      setMessage(
        'Không tải được review submissions. Kiểm tra backend /tasks/review-submissions.',
      );
    }
  }

  useEffect(() => {
    loadSubmissions();
  }, []);

  const filteredSubmissions = useMemo(() => {
    if (statusFilter === 'ALL') {
      return submissions;
    }

    return submissions.filter((item) => item.status === statusFilter);
  }, [submissions, statusFilter]);

  const summary = useMemo(() => {
    return {
      total: submissions.length,
      submitted: submissions.filter((item) => item.status === 'SUBMITTED')
        .length,
      approved: submissions.filter((item) => item.status === 'APPROVED')
        .length,
      revision: submissions.filter(
        (item) => item.status === 'REVISION_REQUESTED',
      ).length,
    };
  }, [submissions]);

  function formatDate(value?: string | null) {
    if (!value) {
      return 'No date';
    }

    return new Date(value).toLocaleString('vi-VN');
  }

  function formatMoney(value: string | number | null | undefined) {
    return Number(value ?? 0).toLocaleString('vi-VN') + 'đ';
  }

  function openDetail(submission: ReviewSubmission) {
    setSelectedSubmission(submission);
    setPreviewUrl(null);
    setRevisionFeedback('');
  }

  function closeDetail() {
    setSelectedSubmission(null);
    setPreviewUrl(null);
    setRevisionFeedback('');
  }

  async function handleApprove() {
    if (!selectedSubmission) {
      return;
    }

    setMessage('Đang approve submission...');

    try {
      await approveSubmission(selectedSubmission.id);
      setMessage('Approve submission thành công.');
      closeDetail();
      await loadSubmissions();
    } catch {
      setMessage('Approve thất bại. Kiểm tra backend approve API.');
    }
  }

  async function handleRequestRevision() {
    if (!selectedSubmission) {
      return;
    }

    if (!revisionFeedback.trim()) {
      setMessage('Vui lòng nhập feedback khi yêu cầu sửa bài.');
      return;
    }

    setMessage('Đang gửi yêu cầu revision...');

    try {
      await requestSubmissionRevision(selectedSubmission.id, revisionFeedback);
      setMessage('Đã yêu cầu Assistant sửa lại bài.');
      closeDetail();
      await loadSubmissions();
    } catch {
      setMessage('Request revision thất bại. Kiểm tra backend revision API.');
    }
  }

  return (
    <AppLayout
      title="Review Submissions"
      subtitle="Review assistant submissions, approve completed work or request revisions."
    >
      <section className="review-submissions-page">
        <div className="review-summary-grid">
          <article className="review-summary-card">
            <span>Total submissions</span>
            <strong>{summary.total.toString().padStart(2, '0')}</strong>
            <p>All submitted work from assistants</p>
          </article>

          <article className="review-summary-card highlight">
            <span>Waiting review</span>
            <strong>{summary.submitted.toString().padStart(2, '0')}</strong>
            <p>Need your decision</p>
          </article>

          <article className="review-summary-card">
            <span>Approved</span>
            <strong>{summary.approved.toString().padStart(2, '0')}</strong>
            <p>Accepted assistant work</p>
          </article>

          <article className="review-summary-card">
            <span>Revision</span>
            <strong>{summary.revision.toString().padStart(2, '0')}</strong>
            <p>Sent back for changes</p>
          </article>
        </div>

        <section className="review-toolbar-card">
          <div>
            <span className="v5-kicker">Production review</span>
            <h2>Assistant submitted work</h2>
            <p>
              Open each submission, inspect the drawing result, then approve it
              or request a revision.
            </p>
          </div>

          <div className="review-filter-group">
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
          <section className="review-message-card">
            <p>{message}</p>
          </section>
        )}

        <section className="review-list">
          {filteredSubmissions.length === 0 && !message && (
            <article className="review-message-card">
              <p>Chưa có submission nào theo bộ lọc hiện tại.</p>
            </article>
          )}

          {filteredSubmissions.map((submission) => (
            <article key={submission.id} className="review-card">
              <div className="review-card-main">
                <span className="review-id">SUBMISSION #{submission.id}</span>
                <h3>
                  {submission.task?.description ??
                    `Task #${submission.taskId}`}
                </h3>
                <p>
                  Assistant:{' '}
                  <strong>
                    {submission.assistant?.displayName ??
                      `User #${submission.assistantUserId}`}
                  </strong>
                </p>
              </div>

              <div className="review-meta-grid">
                <div>
                  <span>Page</span>
                  <strong>
                    {submission.page
                      ? `Page ${submission.page.pageNumber}`
                      : `Page #${submission.pageId}`}
                  </strong>
                </div>

                <div>
                  <span>Region</span>
                  <strong>
                    {submission.task?.region?.type ?? 'No region'}
                  </strong>
                </div>

                <div>
                  <span>Payment</span>
                  <strong>{formatMoney(submission.task?.paymentAmount)}</strong>
                </div>

                <div>
                  <span>Submitted</span>
                  <strong>{formatDate(submission.submittedAt)}</strong>
                </div>
              </div>

              <div className="review-card-side">
                <span className={`review-status status-${submission.status}`}>
                  {statusLabels[submission.status] ?? submission.status}
                </span>

                <button type="button" onClick={() => openDetail(submission)}>
                  Review
                </button>
              </div>
            </article>
          ))}
        </section>
      </section>

      {selectedSubmission && (
        <div className="review-detail-backdrop">
          <section className="review-detail-modal">
            <header className="review-detail-header">
              <div>
                <span className="v5-kicker">Submission review</span>
                <h2>Submission #{selectedSubmission.id}</h2>
                <p>
                  {selectedSubmission.task?.description ??
                    `Task #${selectedSubmission.taskId}`}
                </p>
              </div>

              <button type="button" onClick={closeDetail}>
                ×
              </button>
            </header>

            <section className="review-detail-body">
              <div className="review-preview-panel">
                <div className="review-preview-toolbar">
                  <div>
                    <span>Submitted result</span>
                    <strong>v{selectedSubmission.versionNumber}</strong>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setPreviewUrl(
                        previewUrl ? null : selectedSubmission.fileUrl,
                      )
                    }
                  >
                    {previewUrl ? 'Hide Preview' : 'Show Preview'}
                  </button>
                </div>

                {previewUrl ? (
                  <div className="review-preview-frame">
                    <img src={previewUrl} alt="Submitted result" />
                  </div>
                ) : (
                  <div className="review-preview-empty">
                    <strong>Preview hidden</strong>
                    <p>Bấm Show Preview để xem bản Assistant đã nộp.</p>
                  </div>
                )}
              </div>

              <aside className="review-inspector-panel">
                <article>
                  <span>Status</span>
                  <strong>
                    {statusLabels[selectedSubmission.status] ??
                      selectedSubmission.status}
                  </strong>
                </article>

                <article>
                  <span>Assistant</span>
                  <strong>
                    {selectedSubmission.assistant?.displayName ??
                      `User #${selectedSubmission.assistantUserId}`}
                  </strong>
                  <p>{selectedSubmission.assistant?.email}</p>
                </article>

                <article>
                  <span>Page / Region</span>
                  <strong>
                    {selectedSubmission.page
                      ? `Page ${selectedSubmission.page.pageNumber}`
                      : `Page #${selectedSubmission.pageId}`}
                    {' · '}
                    {selectedSubmission.task?.region?.type ?? 'No region'}
                  </strong>
                </article>

                <article>
                  <span>Payment</span>
                  <strong>
                    {formatMoney(selectedSubmission.task?.paymentAmount)}
                  </strong>
                </article>

                <article>
                  <span>Feedback</span>
                  <p>{selectedSubmission.feedback || 'No feedback note.'}</p>
                </article>
              </aside>
            </section>

            {selectedSubmission.status === 'SUBMITTED' && (
              <section className="review-decision-panel">
                <div>
                  <label>Revision feedback</label>
                  <textarea
                    value={revisionFeedback}
                    onChange={(event) =>
                      setRevisionFeedback(event.target.value)
                    }
                    placeholder="Nhập lý do nếu muốn yêu cầu Assistant sửa lại..."
                  />
                </div>

                <div className="review-decision-actions">
                  <button type="button" onClick={handleRequestRevision}>
                    Request Revision
                  </button>

                  <button type="button" onClick={handleApprove}>
                    Approve Work
                  </button>
                </div>
              </section>
            )}

            <footer className="review-detail-footer">
              <button type="button" onClick={closeDetail}>
                Close
              </button>
            </footer>
          </section>
        </div>
      )}
    </AppLayout>
  );
}
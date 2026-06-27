import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "../layouts/AppLayout";
import {
  approveProposal,
  getPendingProposals,
  rejectProposal,
} from "../features/proposals/board-proposals.api";
import type { SeriesProposal } from "../types/proposal";
import "./BoardProposalsPage.css";

const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export function BoardProposalsPage() {
  const [proposals, setProposals] = useState<SeriesProposal[]>([]);
  const [message, setMessage] = useState("Đang tải proposal...");
  const [selectedProposal, setSelectedProposal] =
    useState<SeriesProposal | null>(null);

  async function loadProposals() {
    setMessage("Đang tải proposal...");

    try {
      const data = await getPendingProposals();

      setProposals(data);
      setMessage("");
    } catch {
      setMessage(
        "Không tải được proposal. Kiểm tra backend /board/series-proposals/pending.",
      );
    }
  }

  useEffect(() => {
    loadProposals();
  }, []);

  const summary = useMemo(() => {
    return {
      total: proposals.length,
      submitted: proposals.filter((item) => item.proposedStatus === "SUBMITTED")
        .length,
      weekly: proposals.filter((item) => item.proposedFrequency === "WEEKLY")
        .length,
      monthly: proposals.filter((item) => item.proposedFrequency === "MONTHLY")
        .length,
    };
  }, [proposals]);

  function formatDate(value: string | null | undefined) {
    if (!value) {
      return "No date";
    }

    return new Date(value).toLocaleString("vi-VN");
  }

  function getGenres(proposal: SeriesProposal) {
    if (!proposal.genres || proposal.genres.length === 0) {
      return "No genre";
    }

    return proposal.genres.map((item) => item.genre.name).join(", ");
  }

  async function handleApprove(proposal: SeriesProposal) {
    setMessage("Đang approve proposal...");

    try {
      await approveProposal(proposal.id);
      setMessage("Approve proposal thành công.");
      setSelectedProposal(null);
      await loadProposals();
    } catch {
      setMessage("Approve thất bại. Kiểm tra backend approve API.");
    }
  }

  async function handleReject(proposal: SeriesProposal) {
    setMessage("Đang reject proposal...");

    try {
      await rejectProposal(proposal.id);
      setMessage("Reject proposal thành công.");
      setSelectedProposal(null);
      await loadProposals();
    } catch {
      setMessage("Reject thất bại. Kiểm tra backend reject API.");
    }
  }

  return (
    <AppLayout
      title="Decision Center"
      subtitle="Review submitted manga proposals and make editorial board decisions."
    >
      <section className="board-page">
        <div className="board-summary-grid">
          <article className="board-summary-card highlight">
            <span>Pending proposals</span>
            <strong>{summary.total.toString().padStart(2, "0")}</strong>
            <p>Waiting for board decision</p>
          </article>

          <article className="board-summary-card">
            <span>Submitted</span>
            <strong>{summary.submitted.toString().padStart(2, "0")}</strong>
            <p>Ready for review</p>
          </article>

          <article className="board-summary-card">
            <span>Weekly releases</span>
            <strong>{summary.weekly.toString().padStart(2, "0")}</strong>
            <p>Proposed weekly schedule</p>
          </article>

          <article className="board-summary-card">
            <span>Monthly releases</span>
            <strong>{summary.monthly.toString().padStart(2, "0")}</strong>
            <p>Proposed monthly schedule</p>
          </article>
        </div>

        <section className="board-toolbar-card">
          <div>
            <span className="v5-kicker">Editorial board</span>
            <h2>Proposal decision queue</h2>
            <p>
              Evaluate submitted manga ideas, check genres and synopsis, then
              approve or reject the proposal.
            </p>
          </div>

          <button type="button" onClick={loadProposals}>
            Refresh
          </button>
        </section>

        {message && (
          <section className="board-message-card">
            <p>{message}</p>
          </section>
        )}

        <section className="board-list">
          {proposals.length === 0 && !message && (
            <article className="board-message-card">
              <p>Hiện chưa có proposal nào chờ duyệt.</p>
            </article>
          )}

          {proposals.map((proposal) => (
            <article key={proposal.id} className="board-proposal-card">
              <div className="board-proposal-main">
                <span className="board-id">PROPOSAL #{proposal.id}</span>
                <h3>{proposal.title}</h3>
                <p>{proposal.synopsis}</p>
              </div>

              <div className="board-proposal-meta">
                <div>
                  <span>Genres</span>
                  <strong>{getGenres(proposal)}</strong>
                </div>

                <div>
                  <span>Frequency</span>
                  <strong>{proposal.proposedFrequency}</strong>
                </div>

                <div>
                  <span>Submitted at</span>
                  <strong>{formatDate(proposal.submittedAt)}</strong>
                </div>

                <div>
                  <span>Status</span>
                  <strong>
                    {statusLabels[proposal.proposedStatus] ??
                      proposal.proposedStatus}
                  </strong>
                </div>
              </div>

              <div className="board-proposal-actions">
                <button
                  type="button"
                  onClick={() => setSelectedProposal(proposal)}
                >
                  View Decision
                </button>
              </div>
            </article>
          ))}
        </section>
      </section>

      {selectedProposal && (
        <div className="board-detail-backdrop">
          <section className="board-detail-modal">
            <header className="board-detail-header">
              <div>
                <span className="v5-kicker">Proposal decision</span>
                <h2>{selectedProposal.title}</h2>
                <p>Proposal #{selectedProposal.id}</p>
              </div>

              <button type="button" onClick={() => setSelectedProposal(null)}>
                ×
              </button>
            </header>

            <section className="board-detail-hero">
              <div>
                <span>Current decision state</span>
                <strong>
                  {statusLabels[selectedProposal.proposedStatus] ??
                    selectedProposal.proposedStatus}
                </strong>
                <p>
                  Review the synopsis and production plan before making a board
                  decision.
                </p>
              </div>

              <span className="board-status">
                {selectedProposal.proposedFrequency}
              </span>
            </section>

            <section className="board-detail-grid">
              <article>
                <span>Genres</span>
                <strong>{getGenres(selectedProposal)}</strong>
              </article>

              <article>
                <span>Submitted at</span>
                <strong>{formatDate(selectedProposal.submittedAt)}</strong>
              </article>

              <article>
                <span>Review due date</span>
                <strong>{formatDate(selectedProposal.reviewDueDate)}</strong>
              </article>
            </section>

            <section className="board-synopsis-card">
              <span>Synopsis</span>
              <p>{selectedProposal.synopsis}</p>
            </section>

            <footer className="board-detail-footer">
              <button
                type="button"
                className="reject"
                onClick={() => handleReject(selectedProposal)}
              >
                Reject Proposal
              </button>

              <button
                type="button"
                className="approve"
                onClick={() => handleApprove(selectedProposal)}
              >
                Approve Proposal
              </button>
            </footer>
          </section>
        </div>
      )}
    </AppLayout>
  );
}
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "../layouts/AppLayout";
import {
  approveBoardProposal,
  getBoardRankings,
  rejectBoardProposal,
  submitBoardVote,
  type BoardRankingItem,
} from "../features/board/board-ranking.api";
import "./BoardRankingPage.css";

export function BoardRankingPage() {
  const [rankings, setRankings] = useState<BoardRankingItem[]>([]);
  const [selectedProposalId, setSelectedProposalId] = useState<number | null>(
    null,
  );

  const [artQuality, setArtQuality] = useState("");
  const [storyClarity, setStoryClarity] = useState("");
  const [marketPotential, setMarketPotential] = useState("");
  const [comment, setComment] = useState("");

  const [message, setMessage] = useState("Đang tải ranking...");
  const [voteMessage, setVoteMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadRankingData() {
    setMessage("Đang tải ranking...");

    try {
      const data = await getBoardRankings();

      setRankings(data);
      setMessage("");

      if (data.length > 0 && selectedProposalId === null) {
        setSelectedProposalId(data[0].id);
        fillVoteForm(data[0]);
      }
    } catch {
      setMessage(
        "Không tải được ranking. Kiểm tra backend /board/rankings hoặc quyền EDITORIAL_BOARD.",
      );
    }
  }

  useEffect(() => {
    loadRankingData();
  }, []);

  const selectedProposal = useMemo(() => {
    return rankings.find((item) => item.id === selectedProposalId) ?? null;
  }, [rankings, selectedProposalId]);

  const summary = useMemo(() => {
    return {
      total: rankings.length,
      voted: rankings.filter((item) => item.voteCount > 0).length,
      lowRisk: rankings.filter((item) => item.riskLevel === "LOW").length,
      mediumRisk: rankings.filter((item) => item.riskLevel === "MEDIUM").length,
      highRisk: rankings.filter((item) => item.riskLevel === "HIGH").length,
    };
  }, [rankings]);

  function getCurrentUserId() {
    const userText = localStorage.getItem("user");

    if (!userText) {
      return null;
    }

    try {
      const user = JSON.parse(userText) as { id?: number };

      return user.id ?? null;
    } catch {
      return null;
    }
  }

  function getMyVote(proposal: BoardRankingItem) {
    const currentUserId = getCurrentUserId();

    if (!proposal.boardVotes || proposal.boardVotes.length === 0) {
      return null;
    }

    if (!currentUserId) {
      return proposal.boardVotes[0];
    }

    return (
      proposal.boardVotes.find((vote) => vote.boardUserId === currentUserId) ??
      proposal.boardVotes[0]
    );
  }

  function fillVoteForm(proposal: BoardRankingItem) {
    const vote = getMyVote(proposal);

    if (!vote) {
      setArtQuality("");
      setStoryClarity("");
      setMarketPotential("");
      setComment("");
      return;
    }

    setArtQuality(String(vote.artQuality));
    setStoryClarity(String(vote.storyClarity));
    setMarketPotential(String(vote.marketPotential));
    setComment(vote.comment ?? "");
  }

  function handleSelectProposal(proposal: BoardRankingItem) {
    setSelectedProposalId(proposal.id);
    setVoteMessage("");
    fillVoteForm(proposal);
  }

  function getGenres(proposal: BoardRankingItem) {
    if (!proposal.genres || proposal.genres.length === 0) {
      return "No genre";
    }

    return proposal.genres.map((item) => item.genre.name).join(", ");
  }

  function formatDate(value: string | null | undefined) {
    if (!value) {
      return "No date";
    }

    return new Date(value).toLocaleString("vi-VN");
  }

  function getVoteStatus(proposal: BoardRankingItem) {
    const vote = getMyVote(proposal);

    if (!vote) {
      return "PENDING";
    }

    return vote.status;
  }

  function getDisplayScore(proposal: BoardRankingItem) {
    if (proposal.averageVoteScore !== null) {
      return proposal.averageVoteScore;
    }

    return proposal.rankingScore;
  }

  function parseScore(value: string) {
    const score = Number(value);

    if (Number.isNaN(score) || score < 1 || score > 10) {
      return null;
    }

    return Number(score.toFixed(1));
  }

  async function handleSubmitVote() {
    if (!selectedProposal) {
      setVoteMessage("Vui lòng chọn một proposal để vote.");
      return;
    }

    const artScore = parseScore(artQuality);
    const storyScore = parseScore(storyClarity);
    const marketScore = parseScore(marketPotential);

    if (artScore === null || storyScore === null || marketScore === null) {
      setVoteMessage("Điểm vote phải nằm trong khoảng từ 1 đến 10.");
      return;
    }

    setIsSubmitting(true);
    setVoteMessage("");

    try {
      await submitBoardVote({
        proposalId: selectedProposal.id,
        artQuality: artScore,
        storyClarity: storyScore,
        marketPotential: marketScore,
        comment: comment.trim(),
      });

      setVoteMessage(`Đã lưu vote cho "${selectedProposal.title}".`);

      const updatedRanking = await getBoardRankings();
      setRankings(updatedRanking);
    } catch {
      setVoteMessage(
        "Không lưu được vote. Kiểm tra backend /board/rankings/vote hoặc quyền EDITORIAL_BOARD.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleApproveProposal() {
    if (!selectedProposal) {
      setVoteMessage("Vui lòng chọn một proposal để approve.");
      return;
    }

    const confirmApprove = window.confirm(
      `Approve proposal "${selectedProposal.title}" và tạo series mới?`,
    );

    if (!confirmApprove) {
      return;
    }

    setIsSubmitting(true);
    setVoteMessage("Đang approve proposal...");

    try {
      await approveBoardProposal(selectedProposal.id);

      setVoteMessage(
        `Đã approve "${selectedProposal.title}" và tạo series thành công.`,
      );

      const updatedRanking = await getBoardRankings();
      setRankings(updatedRanking);
    } catch {
      setVoteMessage(
        "Approve thất bại. Kiểm tra backend hoặc proposal đã được approve chưa.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRejectProposal() {
    if (!selectedProposal) {
      setVoteMessage("Vui lòng chọn một proposal để reject.");
      return;
    }

    const confirmReject = window.confirm(
      `Reject proposal "${selectedProposal.title}"?`,
    );

    if (!confirmReject) {
      return;
    }

    setIsSubmitting(true);
    setVoteMessage("Đang reject proposal...");

    try {
      await rejectBoardProposal(selectedProposal.id);

      setVoteMessage(`Đã reject "${selectedProposal.title}".`);

      const updatedRanking = await getBoardRankings();
      setRankings(updatedRanking);

      if (updatedRanking.length > 0) {
        setSelectedProposalId(updatedRanking[0].id);
      } else {
        setSelectedProposalId(null);
      }
    } catch {
      setVoteMessage("Reject thất bại. Kiểm tra backend hoặc quyền Board.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppLayout
      title="Board Ranking"
      subtitle="Prioritize submitted manga proposals by score, risk and editorial readiness."
    >
      <section className="board-ranking-page">
        <div className="ranking-summary-grid">
          <article className="ranking-summary-card highlight">
            <span>Total candidates</span>
            <strong>{summary.total.toString().padStart(2, "0")}</strong>
            <p>Submitted proposal candidates</p>
          </article>

          <article className="ranking-summary-card">
            <span>Voted</span>
            <strong>{summary.voted.toString().padStart(2, "0")}</strong>
            <p>Board evaluations saved</p>
          </article>

          <article className="ranking-summary-card">
            <span>Medium risk</span>
            <strong>{summary.mediumRisk.toString().padStart(2, "0")}</strong>
            <p>Needs careful evaluation</p>
          </article>

          <article className="ranking-summary-card">
            <span>High risk</span>
            <strong>{summary.highRisk.toString().padStart(2, "0")}</strong>
            <p>Needs more proposal detail</p>
          </article>
        </div>

        <section className="ranking-toolbar-card">
          <div>
            <span className="v5-kicker">Editorial board</span>
            <h2>Proposal ranking board</h2>
            <p>
              Select a proposal, submit board scores and save evaluation into
              the database.
            </p>
          </div>

          <button type="button" onClick={loadRankingData}>
            Refresh
          </button>
        </section>

        {message && (
          <section className="ranking-message-card">
            <p>{message}</p>
          </section>
        )}

        <section className="ranking-workspace">
          <section className="ranking-list">
            {rankings.length === 0 && !message && (
              <article className="ranking-message-card">
                <p>Hiện chưa có proposal nào để xếp hạng.</p>
              </article>
            )}

            {rankings.map((proposal, index) => {
              const voteStatus = getVoteStatus(proposal);
              const vote = getMyVote(proposal);

              return (
                <article
                  key={proposal.id}
                  className={`ranking-card ${
                    selectedProposalId === proposal.id ? "is-selected" : ""
                  }`}
                  onClick={() => handleSelectProposal(proposal)}
                >
                  <div className="ranking-position">
                    <span>Rank</span>
                    <strong>#{index + 1}</strong>
                  </div>

                  <div className="ranking-main">
                    <span className="ranking-id">PROPOSAL #{proposal.id}</span>
                    <h3>{proposal.title}</h3>
                    <p>{proposal.synopsis}</p>
                  </div>

                  <div className="ranking-score-panel">
                    <span>
                      {proposal.averageVoteScore !== null
                        ? "Vote score"
                        : "Auto score"}
                    </span>
                    <strong>{getDisplayScore(proposal)}</strong>
                    <p>
                      {proposal.voteCount > 0
                        ? `${proposal.voteCount} board vote(s)`
                        : proposal.recommendation}
                    </p>
                  </div>

                  <div className="ranking-meta-grid">
                    <div>
                      <span>Risk</span>
                      <strong className={`risk-${proposal.riskLevel}`}>
                        {proposal.riskLevel}
                      </strong>
                    </div>

                    <div>
                      <span>Status</span>
                      <strong className={`vote-${voteStatus}`}>
                        {voteStatus}
                      </strong>
                    </div>

                    <div>
                      <span>Genres</span>
                      <strong>{getGenres(proposal)}</strong>
                    </div>

                    <div>
                      <span>Submitted</span>
                      <strong>{formatDate(proposal.submittedAt)}</strong>
                    </div>
                  </div>

                  {vote?.comment && (
                    <p className="ranking-vote-comment">
                      Board note: {vote.comment}
                    </p>
                  )}
                </article>
              );
            })}
          </section>

          <aside className="ranking-vote-card">
            <span className="v5-kicker">Vote form</span>
            <h2>Board evaluation</h2>

            {selectedProposal ? (
              <p>
                Voting for <strong>{selectedProposal.title}</strong>
              </p>
            ) : (
              <p>Chọn một proposal ở scoreboard để bắt đầu vote.</p>
            )}

            <div className="vote-selected-box">
              <span>Selected proposal</span>
              <strong>
                {selectedProposal
                  ? `#${selectedProposal.id} · ${selectedProposal.title}`
                  : "None"}
              </strong>
            </div>

            <label>
              Art quality 1–10
              <input
                type="number"
                min="1"
                max="10"
                step="0.1"
                value={artQuality}
                placeholder="Example: 8.5"
                onChange={(event) => setArtQuality(event.target.value)}
              />
            </label>

            <label>
              Story clarity 1–10
              <input
                type="number"
                min="1"
                max="10"
                step="0.1"
                value={storyClarity}
                placeholder="Example: 8"
                onChange={(event) => setStoryClarity(event.target.value)}
              />
            </label>

            <label>
              Market potential 1–10
              <input
                type="number"
                min="1"
                max="10"
                step="0.1"
                value={marketPotential}
                placeholder="Example: 7.5"
                onChange={(event) => setMarketPotential(event.target.value)}
              />
            </label>

            <label>
              Comment
              <textarea
                value={comment}
                placeholder="Write board comment..."
                onChange={(event) => setComment(event.target.value)}
              />
            </label>

            {voteMessage && (
              <p className="ranking-vote-message">{voteMessage}</p>
            )}

            <button
              type="button"
              onClick={handleSubmitVote}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving vote..." : "Submit vote"}
            </button>

            <button
              className="approve-proposal-button"
              type="button"
              onClick={handleApproveProposal}
              disabled={isSubmitting || !selectedProposal}
            >
              Approve & Create Series
            </button>
            <button
              className="reject-proposal-button"
              type="button"
              onClick={handleRejectProposal}
              disabled={isSubmitting || !selectedProposal}
            >
              Reject Proposal
            </button>
          </aside>
        </section>
      </section>
    </AppLayout>
  );
}

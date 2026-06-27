import { useEffect, useState } from 'react';
import { AppLayout } from '../layouts/AppLayout';
import {
  createProposal,
  getMyProposals,
  submitProposal,
} from '../features/proposals/proposals.api';
import type { SeriesProposal } from '../types/proposal';
import './MyProposalsPage.css';

const frequencyOptions = ['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'IRREGULAR'];

const genreOptions = [
  { id: 1, name: 'Action' },
  { id: 2, name: 'Fantasy' },
  { id: 3, name: 'Romance' },
  { id: 4, name: 'Drama' },
  { id: 5, name: 'Comedy' },
  { id: 6, name: 'Slice of Life' },
  { id: 7, name: 'Mystery' },
  { id: 8, name: 'Horror' },
];

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    DRAFT: 'Draft',
    SUBMITTED: 'Waiting Board',
    UNDER_REVIEW: 'Under review',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
  };

  return labels[status] ?? status;
}

export function MyProposalsPage() {
  const [proposals, setProposals] = useState<SeriesProposal[]>([]);
  const [title, setTitle] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [proposedFrequency, setProposedFrequency] = useState('WEEKLY');
  const [genreIds, setGenreIds] = useState<number[]>([1]);
  const [message, setMessage] = useState('');

  async function loadProposals() {
    try {
      const data = await getMyProposals();
      setProposals(data);
    } catch {
      setMessage('Không tải được danh sách proposal.');
    }
  }

  useEffect(() => {
    loadProposals();
  }, []);

  function toggleGenre(id: number) {
    setGenreIds((current) => {
      if (current.includes(id)) {
        return current.filter((genreId) => genreId !== id);
      }

      return [...current, id];
    });
  }

  async function handleCreateProposal(event: React.FormEvent) {
    event.preventDefault();

    if (!title.trim() || !synopsis.trim()) {
      setMessage('Vui lòng nhập title và synopsis.');
      return;
    }

    if (genreIds.length === 0) {
      setMessage('Vui lòng chọn ít nhất 1 genre.');
      return;
    }

    setMessage('Đang tạo proposal...');

    try {
      await createProposal({
        title: title.trim(),
        synopsis: synopsis.trim(),
        proposedFrequency,
        genreIds,
      });

      setTitle('');
      setSynopsis('');
      setProposedFrequency('WEEKLY');
      setGenreIds([1]);
      setMessage('Tạo proposal thành công. Hãy submit để gửi Board duyệt.');

      await loadProposals();
    } catch {
      setMessage('Tạo proposal thất bại.');
    }
  }

  async function handleSubmitProposal(id: number) {
    setMessage('Đang gửi proposal cho Board...');

    try {
      await submitProposal(id);
      setMessage('Đã gửi proposal cho Editorial Board duyệt.');
      await loadProposals();
    } catch {
      setMessage('Submit proposal thất bại.');
    }
  }

  return (
    <AppLayout
      title="My Proposals"
      subtitle="Create and manage manga proposals before board review."
    >
      <div className="proposal-page proposal-page-v5">
        <section className="proposal-form-card">
          <div className="section-chip">Mangaka workspace</div>

          <div className="proposal-card-heading">
            <h2>Create Proposal</h2>
            <p>Tạo ý tưởng manga mới để gửi Editorial Board duyệt.</p>
          </div>

          <form onSubmit={handleCreateProposal} className="proposal-form">
            <label>
              Title
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Moonlit Ronin"
              />
            </label>

            <label>
              Synopsis
              <textarea
                value={synopsis}
                onChange={(event) => setSynopsis(event.target.value)}
                placeholder="A wandering swordsman protects a hidden village..."
              />
            </label>

            <label>
              Publication Frequency
              <select
                value={proposedFrequency}
                onChange={(event) =>
                  setProposedFrequency(event.target.value)
                }
              >
                {frequencyOptions.map((frequency) => (
                  <option key={frequency} value={frequency}>
                    {frequency}
                  </option>
                ))}
              </select>
            </label>

            <div className="proposal-field-group">
              <span>Genres</span>

              <div className="genre-list">
                {genreOptions.map((genre) => (
                  <button
                    key={genre.id}
                    type="button"
                    className={
                      genreIds.includes(genre.id)
                        ? 'genre-pill active'
                        : 'genre-pill'
                    }
                    onClick={() => toggleGenre(genre.id)}
                  >
                    {genre.name}
                  </button>
                ))}
              </div>
            </div>

            <button className="primary-action" type="submit">
              Create Proposal
            </button>
          </form>

          {message && <p className="proposal-message">{message}</p>}
        </section>

        <section className="proposal-list-card">
          <div className="section-chip">Proposal list</div>

          <div className="proposal-card-heading">
            <h2>My Proposals</h2>
            <p>Theo dõi trạng thái proposal đã tạo.</p>
          </div>

          <div className="proposal-list">
            {proposals.length === 0 && (
              <p className="empty-text">Chưa có proposal nào.</p>
            )}

            {proposals.map((proposal) => {
              const canSubmit =
                proposal.proposedStatus === 'DRAFT' ||
                proposal.proposedStatus === 'REJECTED';

              return (
                <article key={proposal.id} className="proposal-item">
                  <div className="proposal-item-main">
                    <div>
                      <span className="proposal-id">PROPOSAL #{proposal.id}</span>
                      <h3>{proposal.title}</h3>
                      <p>{proposal.synopsis}</p>
                    </div>

                    {canSubmit && (
                      <button
                        className="submit-button"
                        type="button"
                        onClick={() => handleSubmitProposal(proposal.id)}
                      >
                        Submit to Board
                      </button>
                    )}
                  </div>

                  <div className="proposal-meta">
                    <span>{proposal.proposedFrequency}</span>
                    <span className={`status-${proposal.proposedStatus}`}>
                      {getStatusLabel(proposal.proposedStatus)}
                    </span>
                  </div>

                  <div className="proposal-genres">
                    {proposal.genres.map((item) => (
                      <span key={item.genreId}>{item.genre.name}</span>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import {
  createChapter,
  getChaptersBySeries,
} from '../features/series/series.api';
import type { Chapter } from '../types/series';
import './MyChaptersPage.css';

export function MyChaptersPage() {
  const navigate = useNavigate();

  const [seriesId, setSeriesId] = useState(1);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chapterNumber, setChapterNumber] = useState(1);
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState('');
  const [message, setMessage] = useState('');

  async function loadChapters() {
    setMessage('Đang tải chapters...');

    try {
      const data = await getChaptersBySeries(seriesId);
      setChapters(data);
      setMessage('');
    } catch {
      setMessage('Không tải được chapters. Kiểm tra Series ID hoặc backend.');
    }
  }

  async function handleCreateChapter(event: React.FormEvent) {
    event.preventDefault();

    if (!title.trim()) {
      setMessage('Vui lòng nhập tên chapter.');
      return;
    }

    setMessage('Đang tạo chapter...');

    try {
      await createChapter({
        seriesId,
        chapterNumber,
        title,
        deadline: deadline || undefined,
      });

      setTitle('');
      setDeadline('');
      setChapterNumber((current) => current + 1);
      setMessage('Tạo chapter thành công.');

      await loadChapters();
    } catch {
      setMessage('Tạo chapter thất bại. Kiểm tra Series ID có tồn tại không.');
    }
  }

  return (
    <AppLayout
      title="Chapter Management"
      subtitle="Create chapters for your manga series and continue to page workspace."
    >
      <section className="chapters-page">
        <aside className="chapter-control-card">
          <div className="section-chip">Series input</div>

          <h2>Series</h2>

          <label>Series ID</label>
          <input
            type="number"
            min={1}
            value={seriesId}
            onChange={(event) => setSeriesId(Number(event.target.value))}
          />

          <button className="primary-action" type="button" onClick={loadChapters}>
            Load Chapters
          </button>

          {message && <p className="chapter-message">{message}</p>}
        </aside>

        <form className="chapter-form-card" onSubmit={handleCreateChapter}>
          <div className="section-chip">Create chapter</div>

          <h2>New Chapter</h2>

          <label>Chapter number</label>
          <input
            type="number"
            min={1}
            value={chapterNumber}
            onChange={(event) => setChapterNumber(Number(event.target.value))}
          />

          <label>Chapter title</label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Chapter 1: The First Ink"
          />

          <label>Deadline</label>
          <input
            type="date"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
          />

          <button className="primary-action" type="submit">
            Create Chapter
          </button>
        </form>

        <section className="chapter-list-card">
          <div className="section-chip">Chapters</div>

          <h2>Chapter List</h2>

          <div className="chapter-list">
            {chapters.length === 0 && (
              <p className="empty-text">
                Chưa có chapter nào. Nhập Series ID rồi bấm Load Chapters.
              </p>
            )}

            {chapters.map((chapter) => (
              <article key={chapter.id} className="chapter-item">
                <div>
                  <span className="chapter-number">
                    Chapter {chapter.chapterNumber}
                  </span>

                  <h3>{chapter.title}</h3>

                  <p>
                    Status: <strong>{chapter.status}</strong>
                  </p>

                  <p>
                    Deadline:{' '}
                    <strong>
                      {chapter.deadline
                        ? new Date(chapter.deadline).toLocaleDateString()
                        : 'Not set'}
                    </strong>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/mangaka/pages')}
                >
                  Open Pages
                </button>
              </article>
            ))}
          </div>
        </section>
      </section>
    </AppLayout>
  );
}
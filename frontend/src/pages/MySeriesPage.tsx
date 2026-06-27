import { useEffect, useState } from 'react';
import { AppLayout } from '../layouts/AppLayout';
import {
  createChapter,
  getChaptersBySeries,
  getMySeries,
} from '../features/series/series.api';
import type { Chapter, Series } from '../types/series';
import './MySeriesPage.css';

export function MySeriesPage() {
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);

  const [chapterNumber, setChapterNumber] = useState(1);
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState('');
  const [message, setMessage] = useState('');

  async function loadSeries() {
    try {
      const data = await getMySeries();
      setSeriesList(data);

      if (data.length > 0 && !selectedSeries) {
        setSelectedSeries(data[0]);
        await loadChapters(data[0].id);
      }
    } catch {
      setMessage(
        'Không tải được series. Có thể backend chưa có API /series/mine.',
      );
    }
  }

  async function loadChapters(seriesId: number) {
    try {
      const data = await getChaptersBySeries(seriesId);
      setChapters(data);
    } catch {
      setMessage('Không tải được danh sách chapter.');
    }
  }

  useEffect(() => {
    loadSeries();
  }, []);

  async function handleSelectSeries(series: Series) {
    setSelectedSeries(series);
    await loadChapters(series.id);
  }

  async function handleCreateChapter(event: React.FormEvent) {
    event.preventDefault();

    if (!selectedSeries) {
      setMessage('Vui lòng chọn series trước.');
      return;
    }

    setMessage('Đang tạo chapter...');

    try {
      await createChapter({
        seriesId: selectedSeries.id,
        chapterNumber,
        title,
        deadline: deadline
          ? new Date(deadline).toISOString()
          : undefined,
      });

      setTitle('');
      setDeadline('');
      setChapterNumber((current) => current + 1);
      setMessage('Tạo chapter thành công.');

      await loadChapters(selectedSeries.id);
    } catch {
      setMessage('Tạo chapter thất bại.');
    }
  }

  return (
    <AppLayout
      title="My Series"
      subtitle="Manage approved manga series and create production chapters."
    >
      <section className="series-page">
        <aside className="series-list-card">
          <div className="section-chip">Approved series</div>

          <h2>Series</h2>

          <div className="series-list">
            {seriesList.length === 0 && (
              <p className="empty-text">
                Chưa có series nào. Hãy submit proposal và chờ Board approve.
              </p>
            )}

            {seriesList.map((series) => (
              <button
                key={series.id}
                className={
                  selectedSeries?.id === series.id
                    ? 'series-item active'
                    : 'series-item'
                }
                onClick={() => handleSelectSeries(series)}
              >
                <strong>{series.title}</strong>
                <span>{series.status}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="chapter-workspace">
          <div className="chapter-header-card">
            <div className="section-chip">Chapter workspace</div>

            <h2>{selectedSeries?.title ?? 'No series selected'}</h2>

            <p>
              Tạo chapter mới cho series đã được Editorial Board duyệt.
            </p>
          </div>

          <div className="chapter-grid">
            <form
              className="chapter-form-card"
              onSubmit={handleCreateChapter}
            >
              <h3>Create Chapter</h3>

              <label>Chapter number</label>
              <input
                type="number"
                min={1}
                value={chapterNumber}
                onChange={(event) =>
                  setChapterNumber(Number(event.target.value))
                }
              />

              <label>Chapter title</label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="The Hidden Village"
              />

              <label>Deadline</label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(event) => setDeadline(event.target.value)}
              />

              <button className="primary-action" type="submit">
                Create Chapter
              </button>

              {message && <p className="series-message">{message}</p>}
            </form>

            <div className="chapter-list-card">
              <h3>Chapters</h3>

              <div className="chapter-list">
                {chapters.length === 0 && (
                  <p className="empty-text">Chưa có chapter nào.</p>
                )}

                {chapters.map((chapter) => (
                  <article key={chapter.id} className="chapter-item">
                    <div>
                      <h4>
                        Chapter {chapter.chapterNumber}: {chapter.title}
                      </h4>

                      <p>
                        Deadline:{' '}
                        {chapter.deadline
                          ? new Date(chapter.deadline).toLocaleString()
                          : 'No deadline'}
                      </p>
                    </div>

                    <span>{chapter.status}</span>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      </section>
    </AppLayout>
  );
}
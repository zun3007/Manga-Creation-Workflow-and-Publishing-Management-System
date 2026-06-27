import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { getDashboardOverview } from '../features/dashboard/dashboard.api';
import type { DashboardOverview } from '../types/dashboard';
import './DashboardPage.css';

export function DashboardPage() {
  const navigate = useNavigate();

  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [message, setMessage] = useState('Đang tải dashboard...');

  async function loadDashboard() {
    setMessage('Đang tải dashboard...');

    try {
      const data = await getDashboardOverview();

      setOverview(data);
      setMessage('');
    } catch {
      setMessage(
        'Không tải được dashboard. Kiểm tra backend /dashboard/overview hoặc token đăng nhập.',
      );
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  if (!overview) {
    return (
      <AppLayout
        title="MangaFlow Dashboard"
        subtitle="Loading MangaFlow Forest Studio overview."
      >
        <section className="v5-panel">
          <p className="dashboard-loading-text">{message}</p>
        </section>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={overview.title} subtitle={overview.subtitle}>
      <section className="v5-dashboard">
        {message && (
          <section className="v5-panel">
            <p className="dashboard-loading-text">{message}</p>
          </section>
        )}

        <div className="v5-stat-grid">
          {overview.cards.map((card) => (
            <article key={card.label} className="v5-stat-card">
              <div className="v5-stat-icon">{card.icon}</div>

              <div>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
                <p>{card.note}</p>
              </div>
            </article>
          ))}
        </div>

        <section className="v5-dashboard-main-grid">
          <article className="v5-panel v5-quick-actions-panel">
            <div className="v5-panel-heading">
              <div>
                <span className="v5-kicker">Quick actions</span>
                <h2>Continue your workflow</h2>
              </div>

              <span className="v5-soft-badge">Live studio</span>
            </div>

            <div className="v5-action-list">
              {overview.actions.length === 0 && (
                <p className="dashboard-loading-text">
                  No quick actions available for this role.
                </p>
              )}

              {overview.actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  className="v5-action-card"
                  onClick={() => navigate(action.path)}
                >
                  <span className="v5-action-icon">{action.icon}</span>

                  <span>
                    <strong>{action.label}</strong>
                    <small>{action.description}</small>
                  </span>
                </button>
              ))}
            </div>
          </article>

          <article className="v5-panel v5-progress-panel">
            <div className="v5-panel-heading">
              <div>
                <span className="v5-kicker">Progress</span>
                <h2>Production health</h2>
              </div>
            </div>

            <div className="v5-progress-list">
              {overview.progress.length === 0 && (
                <p className="dashboard-loading-text">
                  No progress data available yet.
                </p>
              )}

              {overview.progress.map((item) => (
                <div key={item.label}>
                  <div className="v5-progress-label">
                    <span>{item.label}</span>
                    <strong>{item.value}%</strong>
                  </div>

                  <div className="v5-progress-bar">
                    <span style={{ width: `${item.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="v5-panel v5-flow-panel">
          <div className="v5-panel-heading">
            <div>
              <span className="v5-kicker">Production flow</span>
              <h2>Manga workflow pipeline</h2>
            </div>
          </div>

          <div className="v5-flow-steps">
            {overview.flow.map((step) => (
              <div key={step.order}>
                <span>{step.order}</span>
                <strong>{step.label}</strong>
                <p>{step.description}</p>
              </div>
            ))}
          </div>
        </section>
      </section>
    </AppLayout>
  );
}
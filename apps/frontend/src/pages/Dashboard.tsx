import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { Panel } from '../components/ui/Panel';
import MangakaDashboard from './mangaka/Dashboard';

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Panel className="p-5">
      <div className="font-mono text-[0.62rem] uppercase tracking-wider text-ink-soft">
        {label}
      </div>
      <div className="mt-1 text-3xl text-ink">{value}</div>
    </Panel>
  );
}

const CFG: Record<
  string,
  {
    title: string;
    cards: [string, string][];
    cta?: { to: string; label: string };
    extraCta?: { to: string; label: string };
  }
> = {
  ASSISTANT: {
    title: 'Tổng quan trợ lý',
    cards: [
      ['Được giao', 'assigned'],
      ['Đang làm', 'inProgress'],
      ['Đã nộp', 'submitted'],
      ['Cần sửa', 'revisions'],
    ],
    cta: { to: '/my-tasks', label: 'Việc của tôi' },
  },
  TANTOU_EDITOR: {
    title: 'Tổng quan biên tập',
    cards: [
      ['Chương chờ duyệt', 'chaptersToReview'],
      ['Series phụ trách', 'managedSeries'],
    ],
    cta: { to: '/editor/review', label: 'Duyệt chương' },
    extraCta: { to: '/editor/series', label: 'Xem series quản lý' },
  },
  EDITORIAL_BOARD: {
    title: 'Tổng quan hội đồng',
    cards: [
      ['Đề xuất chờ duyệt', 'proposalsToReview'],
      ['Đang xem xét', 'underReview'],
    ],
    cta: { to: '/board/proposals', label: 'Duyệt đề xuất' },
  },
  ADMIN: {
    title: 'Tổng quan hệ thống',
    cards: [
      ['Người dùng', 'users'],
      ['Hoạ sĩ', 'mangaka'],
      ['Trợ lý', 'assistants'],
      ['Series', 'series'],
      ['Chương', 'chapters'],
      ['Đề xuất', 'proposals'],
    ],
    cta: { to: '/admin', label: 'Quản trị' },
  },
};

function RoleDashboard({ role }: { role: string }) {
  const [s, setS] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setError(false);
    try {
      const r = await api.get('/dashboard/summary');
      setS(r.data);
    } catch (e) {
      console.error("Failed to load dashboard summary", e);
      setError(true);
      setS(null);
    }
  }

  const c = CFG[role] ?? CFG.ASSISTANT;

  return (
    <div className="p-8">
      <h1 className="text-3xl text-ink mb-6">{c.title}</h1>
      {error ? (
        <Panel className="p-6 bg-danger/10 border-danger/20">
          <p className="text-danger mb-4">Không thể tải dữ liệu tổng quan. Vui lòng thử lại.</p>
          <button
            onClick={loadStats}
            className="inline-block rounded bg-accent px-4 py-2 text-white hover:bg-accent/90 transition"
          >
            Thử lại
          </button>
        </Panel>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {c.cards.map(([label, key]) => (
              <StatCard key={key} label={label} value={s?.[key] ?? 0} />
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            {c.cta && (
              <Link
                to={c.cta.to}
                className="inline-block rounded bg-accent px-4 py-2 text-white"
              >
                {c.cta.label} →
              </Link>
            )}
            {c.extraCta && (
              <Link
                to={c.extraCta.to}
                className="inline-block rounded border border-line bg-surface px-4 py-2 text-ink hover:bg-bg"
              >
                {c.extraCta.label} →
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  if (user?.role === 'MANGAKA') return <MangakaDashboard />;
  return <RoleDashboard role={user?.role ?? 'ASSISTANT'} />;
}

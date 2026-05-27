import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Layers,
  Inbox,
  CheckSquare,
  AlertTriangle,
  Bell,
  CalendarClock,
  CircleDollarSign,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Sidebar } from '../components/dashboard/Sidebar';
import { Panel } from '../components/ui/Panel';
import { Stamp } from '../components/ui/Stamp';
import type { Summary, Series, Task, Submission, AppNotification } from '../types';

const num = (v: any) => Number(v ?? 0);
const money = (v: any) => `$${num(v).toFixed(0)}`;
const initials = (n = '') =>
  n.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '—';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};
const MV = motion.div as any;

function Avatar({ url, name }: { url: string | null; name: string }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="h-9 w-9 shrink-0 border-2 border-ink object-cover"
      />
    );
  }
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center border-2 border-ink bg-paper-3 font-mono text-[0.6rem]">
      {initials(name)}
    </span>
  );
}

function StatCard({
  label,
  value,
  Icon,
  accent,
}: {
  label: string;
  value: number;
  Icon: any;
  accent?: 'vermilion' | 'amber';
}) {
  const alert = accent && value > 0;
  return (
    <MV variants={item}>
      <Panel className="p-4">
        <div className="flex items-start justify-between">
          <p className="label">{label}</p>
          <Icon
            size={18}
            className={alert ? (accent === 'vermilion' ? 'text-vermilion' : 'text-amber') : 'text-ink-3'}
          />
        </div>
        <p
          className={`mt-2 font-display text-4xl ${
            alert ? (accent === 'vermilion' ? 'text-vermilion' : 'text-amber') : 'text-ink'
          }`}
        >
          {value}
        </p>
      </Panel>
    </MV>
  );
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="mt-3 h-3 w-full border-2 border-ink bg-paper-3">
      <div className="halftone h-full bg-ink/10" style={{ width: `${pct}%`, background: 'var(--ink)' }} />
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [series, setSeries] = useState<Series[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, se, t, su, n] = await Promise.all([
          api.get('/dashboard/summary'),
          api.get('/dashboard/series'),
          api.get('/dashboard/tasks'),
          api.get('/dashboard/submissions'),
          api.get('/dashboard/notifications'),
        ]);
        setSummary(s.data);
        setSeries(se.data);
        setTasks(t.data);
        setSubmissions(su.data);
        setNotifs(n.data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Vietnamese names: address by the given name = last token (e.g. "Nguyễn Tiến Dũng" → "Dũng")
  const nameParts = user?.name?.trim().split(/\s+/) ?? [];
  const firstName = nameParts[nameParts.length - 1] || 'Mangaka';
  const today = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const unread = num(summary?.unreadNotifications);

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar />

      <main className="min-w-0 flex-1">
        {/* Topbar */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b-2 border-ink bg-paper/95 px-8 py-5 backdrop-blur">
          <div>
            <p className="label capitalize">{today}</p>
            <h1 className="mt-1 text-3xl">
              Konnichiwa, <span className="text-vermilion">{firstName}</span>
            </h1>
          </div>
          <button className="relative grid h-11 w-11 place-items-center border-2 border-ink bg-paper shadow-ink-sm transition hover:-translate-x-0.5 hover:-translate-y-0.5">
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center bg-vermilion px-1 font-mono text-[0.6rem] text-paper">
                {unread}
              </span>
            )}
          </button>
        </header>

        {loading ? (
          <div className="grid h-[60vh] place-items-center">
            <span className="label animate-pulse">Đang dựng studio…</span>
          </div>
        ) : (
          <MV
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-8 p-8"
          >
            {/* Stat strip */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
              <StatCard label="Series hoạt động" value={num(summary?.activeSeries)} Icon={BookOpen} />
              <StatCard label="Chương đang vẽ" value={num(summary?.chaptersInProgress)} Icon={Layers} />
              <StatCard label="Chờ bạn duyệt" value={num(summary?.pendingReview)} Icon={Inbox} accent="vermilion" />
              <StatCard label="Task đang mở" value={num(summary?.openTasks)} Icon={CheckSquare} />
              <StatCard label="Series rủi ro" value={num(summary?.atRiskSeries)} Icon={AlertTriangle} accent="amber" />
            </div>

            <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.6fr_1fr]">
              {/* LEFT column */}
              <div className="space-y-8">
                {/* Series */}
                <section>
                  <div className="mb-4 flex items-end justify-between">
                    <h2 className="text-2xl">Series của bạn</h2>
                    <span className="label">{series.length} bộ truyện</span>
                  </div>
                  <div className="space-y-4">
                    {series.map((s) => (
                      <MV key={s.id} variants={item}>
                        <Panel className="flex items-center gap-5 p-5 transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-ink-lg">
                          <div className="grid h-20 w-20 shrink-0 place-items-center bg-ink text-paper">
                            <span className="label text-[0.5rem] text-paper/60">RANK</span>
                            <span className="font-display text-3xl leading-none">
                              {s.rankPosition ? `#${s.rankPosition}` : '—'}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-xl">{s.title}</h3>
                              <Stamp status={s.status} />
                              {s.riskLevel && <Stamp status={s.riskLevel} label={`RISK ${s.riskLevel}`} />}
                            </div>
                            <p className="label mt-1">
                              {s.frequency} · {num(s.published)}/{num(s.chapters)} chương ·{' '}
                              điểm {s.score ? num(s.score) : '—'}
                            </p>
                            <ProgressBar value={num(s.published)} max={num(s.chapters)} />
                          </div>
                        </Panel>
                      </MV>
                    ))}
                  </div>
                </section>

                {/* Task board */}
                <section>
                  <h2 className="mb-4 text-2xl">Bảng công việc</h2>
                  <MV variants={item}>
                    <Panel className="divide-y-2 divide-paper-3">
                      {tasks.map((t) => (
                        <div key={t.id} className="flex items-center gap-4 p-4">
                          <Avatar url={t.assigneeAvatar} name={t.assignee} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-bold">{t.description}</p>
                            <p className="label mt-0.5">
                              {t.assignee} · {t.series ?? '—'}
                              {t.page ? ` · trang ${t.page}` : ''}
                            </p>
                          </div>
                          <div className="hidden items-center gap-1 font-mono text-xs text-ink-3 sm:flex">
                            <CircleDollarSign size={14} /> {money(t.payment)}
                          </div>
                          <div className="hidden items-center gap-1 font-mono text-xs text-ink-3 md:flex">
                            <CalendarClock size={14} /> {fmtDate(t.deadline)}
                          </div>
                          <Stamp status={t.status} />
                        </div>
                      ))}
                      {tasks.length === 0 && (
                        <p className="p-6 text-center text-sm text-ink-3">Chưa có task nào.</p>
                      )}
                    </Panel>
                  </MV>
                </section>
              </div>

              {/* RIGHT column */}
              <div className="space-y-8">
                {/* Submissions queue */}
                <section>
                  <div className="mb-4 flex items-end justify-between">
                    <h2 className="text-2xl">Chờ duyệt</h2>
                    <span className="label">{submissions.length} bài</span>
                  </div>
                  <MV variants={item}>
                    <Panel tone="paper-2" className="space-y-3 p-4">
                      {submissions.map((sub) => (
                        <div key={sub.id} className="flex items-center gap-3 border-2 border-ink bg-paper p-3">
                          <Avatar url={sub.assistantAvatar} name={sub.assistant} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold">{sub.task}</p>
                            <p className="label mt-0.5">{sub.assistant}</p>
                          </div>
                          <button className="btn btn-vermilion px-3 py-1.5 text-xs shadow-ink-sm">Duyệt</button>
                        </div>
                      ))}
                      {submissions.length === 0 && (
                        <p className="py-6 text-center text-sm text-ink-3">Sạch sẽ — không có bài chờ.</p>
                      )}
                    </Panel>
                  </MV>
                </section>

                {/* Notifications */}
                <section>
                  <h2 className="mb-4 text-2xl">Thông báo</h2>
                  <MV variants={item}>
                    <Panel className="divide-y-2 divide-paper-3">
                      {notifs.map((n) => (
                        <div key={n.id} className="flex gap-3 p-4">
                          <span
                            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                              n.isRead ? 'bg-paper-3' : 'bg-vermilion'
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <Stamp status={n.type} />
                            </div>
                            <p className="mt-1.5 text-sm font-bold leading-snug">{n.title}</p>
                            {n.content && (
                              <p className="mt-0.5 text-xs leading-snug text-ink-3">{n.content}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </Panel>
                  </MV>
                </section>
              </div>
            </div>
          </MV>
        )}
      </main>
    </div>
  );
}

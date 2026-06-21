import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import {
  BookOpen,
  Layers,
  Inbox,
  CheckSquare,
  AlertTriangle,
  CalendarClock,
  CircleDollarSign,
  type LucideIcon,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { Panel } from '../../components/ui/Panel';
import { Stamp } from '../../components/ui/Stamp';
import { Avatar } from '../../components/ui/Avatar';
import { Progress } from '../../components/ui/Progress';
import { Button } from '../../components/ui/Button';
import type { Summary, Series, Task, Submission, AppNotification } from '../../types';

const num = (v: unknown) => Number(v ?? 0);
const money = (v: unknown) => `${num(v).toLocaleString("vi-VN")} ₫`;
const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '—';

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};
const MV = motion.div;

function StatCard({
  label,
  value,
  Icon,
  accent,
}: {
  label: string;
  value: number;
  Icon: LucideIcon;
  accent?: 'warn' | 'danger';
}) {
  const alert = accent && value > 0;
  return (
    <MV variants={item}>
      <Panel className="p-4">
        <div className="flex items-start justify-between">
          <p className="font-mono text-[0.62rem] uppercase tracking-wider text-ink-soft">{label}</p>
          <Icon
            size={18}
            className={alert ? (accent === 'danger' ? 'text-danger' : 'text-warn') : 'text-ink-soft'}
          />
        </div>
        <p
          className={`mt-2 font-display text-4xl ${
            alert ? (accent === 'danger' ? 'text-danger' : 'text-warn') : 'text-ink'
          }`}
        >
          {value}
        </p>
      </Panel>
    </MV>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [series, setSeries] = useState<Series[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function load() {
    setLoading(true);
    setError(false);
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
    } catch (e) {
      // Surface the failure instead of silently showing an empty dashboard.
      console.error('Dashboard load failed', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
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

  return (
    <>
      {loading ? (
        <div className="grid h-[60vh] place-items-center">
          <span className="font-mono text-xs uppercase tracking-wider animate-pulse text-ink-soft">
            Đang dựng studio…
          </span>
        </div>
      ) : error ? (
        <div className="grid h-[60vh] place-items-center p-8">
          <Panel className="p-6 text-center">
            <p className="text-ink">Không tải được dữ liệu studio.</p>
            <Button className="mt-4" onClick={load}>Thử lại</Button>
          </Panel>
        </div>
      ) : (
        <MV
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-8 p-8"
        >
          {/* Greeting */}
          <div className="px-8 pt-8">
            <p className="font-mono text-[0.62rem] uppercase tracking-wider text-ink-soft">{today}</p>
            <h1 className="mt-1 text-3xl">
              Konnichiwa, <span className="text-accent">{firstName}</span>
            </h1>
          </div>

          {/* Stat strip */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
            <StatCard label="Series hoạt động" value={num(summary?.activeSeries)} Icon={BookOpen} />
            <StatCard label="Chương đang vẽ" value={num(summary?.chaptersInProgress)} Icon={Layers} />
            <StatCard label="Chờ bạn duyệt" value={num(summary?.pendingReview)} Icon={Inbox} accent="danger" />
            <StatCard label="Task đang mở" value={num(summary?.openTasks)} Icon={CheckSquare} />
            <StatCard label="Series rủi ro" value={num(summary?.atRiskSeries)} Icon={AlertTriangle} accent="warn" />
          </div>

          <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.6fr_1fr]">
            {/* LEFT column */}
            <div className="space-y-8">
              {/* Series */}
              <section>
                <div className="mb-4 flex items-end justify-between">
                  <h2 className="text-2xl">Series của bạn</h2>
                  <span className="font-mono text-[0.62rem] uppercase tracking-wider text-ink-soft">{series.length} bộ truyện</span>
                </div>
                <div className="space-y-4">
                  {series.map((s) => (
                    <MV key={s.id} variants={item}>
                      <Panel className="flex items-center gap-5 p-5 transition hover:-translate-x-0.5 hover:-translate-y-0.5">
                        <div className="grid h-20 w-20 shrink-0 place-items-center bg-accent/12 rounded-[var(--app-radius)] text-accent">
                          <span className="font-mono text-[0.5rem] uppercase tracking-wider">Rank</span>
                          <span className="font-display text-3xl leading-none">
                            {s.rankPosition ? `#${s.rankPosition}` : '—'}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-xl text-ink">{s.title}</h3>
                            <Stamp status={s.status} />
                            {s.riskLevel && <Stamp status={s.riskLevel} label={`RISK ${s.riskLevel}`} />}
                          </div>
                          <p className="font-mono text-[0.62rem] uppercase tracking-wider text-ink-soft mt-1">
                            {s.frequency} · {num(s.published)}/{num(s.chapters)} chương ·{' '}
                            điểm {s.score ? num(s.score) : '—'}
                          </p>
                          <Progress value={num(s.published)} max={num(s.chapters)} />
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
                  <Panel className="divide-y divide-line">
                    {tasks.map((t) => (
                      <div key={t.id} className="flex items-center gap-4 p-4">
                        <Avatar url={t.assigneeAvatar} name={t.assignee} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-ink">{t.description}</p>
                          <p className="font-mono text-[0.62rem] uppercase tracking-wider text-ink-soft mt-0.5">
                            {t.assignee} · {t.series ?? '—'}
                            {t.page ? ` · trang ${t.page}` : ''}
                          </p>
                        </div>
                        <div className="hidden items-center gap-1 font-mono text-xs text-ink-soft sm:flex">
                          <CircleDollarSign size={14} /> {money(t.payment)}
                        </div>
                        <div className="hidden items-center gap-1 font-mono text-xs text-ink-soft md:flex">
                          <CalendarClock size={14} /> {fmtDate(t.deadline)}
                        </div>
                        <Stamp status={t.status} />
                      </div>
                    ))}
                    {tasks.length === 0 && (
                      <p className="p-6 text-center text-sm text-ink-soft">Chưa có task nào.</p>
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
                  <span className="font-mono text-[0.62rem] uppercase tracking-wider text-ink-soft">{submissions.length} bài</span>
                </div>
                <MV variants={item}>
                  <Panel className="space-y-3 p-4">
                    {submissions.map((sub) => (
                      <div key={sub.id} className="flex items-center gap-3 border border-line rounded-[var(--app-radius)] bg-bg p-3">
                        <Avatar url={sub.assistantAvatar} name={sub.assistant} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink">{sub.task}</p>
                          <p className="font-mono text-[0.62rem] uppercase tracking-wider text-ink-soft mt-0.5">{sub.assistant}</p>
                        </div>
                        <Button className="px-3 py-1.5 text-xs" onClick={() => navigate('/review')}>Duyệt</Button>
                      </div>
                    ))}
                    {submissions.length === 0 && (
                      <p className="py-6 text-center text-sm text-ink-soft">Sạch sẽ — không có bài chờ.</p>
                    )}
                  </Panel>
                </MV>
              </section>

              {/* Notifications */}
              <section>
                <h2 className="mb-4 text-2xl">Thông báo</h2>
                <MV variants={item}>
                  <Panel className="divide-y divide-line">
                    {notifs.map((n) => (
                      <div key={n.id} className="flex gap-3 p-4">
                        <span
                          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                            n.isRead ? 'bg-line' : 'bg-danger'
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Stamp status={n.type} />
                          </div>
                          <p className="mt-1.5 text-sm font-semibold leading-snug text-ink">{n.title}</p>
                          {n.content && (
                            <p className="mt-0.5 text-xs leading-snug text-ink-soft">{n.content}</p>
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
    </>
  );
}

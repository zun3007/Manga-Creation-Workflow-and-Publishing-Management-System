import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowLeft, FileText, Send } from "lucide-react";
import { Role } from "@manga/shared";
import { api, apiErrorMessage } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useToast } from "../../components/ui/Toast";
import { Panel } from "../../components/ui/Panel";
import { Button } from "../../components/ui/Button";
import { Stamp } from "../../components/ui/Stamp";
import { EmptyState } from "../../components/ui/EmptyState";

type RankingPoint = {
  id: number;
  rankPosition: number;
  totalScore: string | number;
  riskLevel: string;
  periodType: string;
  periodStartDate: string;
  periodEndDate: string;
};

type DecisionItem = {
  id: number;
  type: string;
  newFrequency: string | null;
  reason: string;
  decidedAt: string;
  decidedBy: string | null;
};

type DefenseReport = {
  id: number;
  content: string;
  createdAt: string;
  authorId: number;
  authorName: string | null;
};

type SeriesDossier = {
  series: {
    id: number;
    title: string;
    status: string;
    frequency: string;
  };
  rankingHistory: RankingPoint[];
  publicationStats: {
    publishedChapters: number;
    scheduledPublishedChapters: number;
    onTimeChapters: number;
    lateChapters: number;
    onTimeRate: number;
  };
  taskStats: {
    totalTasks: number;
    approvedTasks: number;
    approvedOnTimeTasks: number;
    revisionRequiredCount: number;
    approvedOnTimeRate: number;
    averageRevisionsPerTask: number;
  };
  decisions: DecisionItem[];
  defenseReports: DefenseReport[];
};

type DecisionType = "CONTINUE" | "CANCEL" | "HIATUS" | "CHANGE_FREQUENCY";
type FrequencyType = "WEEKLY" | "MONTHLY";

const date = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString("vi-VN") : "—";

const num = (value: unknown) => Number(value ?? 0);

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Panel className="p-5">
      <div className="font-mono text-[0.62rem] uppercase tracking-wider text-ink-soft">
        {label}
      </div>
      <div className="mt-2 text-3xl text-ink">{value}</div>
      {hint && <div className="mt-2 text-xs text-muted">{hint}</div>}
    </Panel>
  );
}

export default function SeriesDossierPage() {
  const { seriesId } = useParams<{ seriesId: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const [dossier, setDossier] = useState<SeriesDossier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [decisionType, setDecisionType] = useState<DecisionType>("CONTINUE");
  const [newFrequency, setNewFrequency] = useState<FrequencyType>("WEEKLY");
  const [decisionReason, setDecisionReason] = useState("");
  const [deciding, setDeciding] = useState(false);

  useEffect(() => {
    void loadDossier();
  }, [seriesId]);

  async function loadDossier() {
    if (!seriesId) return;
    setLoading(true);
    setError("");
    try {
      const response = await api.get<SeriesDossier>(`/series/${seriesId}/dossier`);
      setDossier(response.data);
    } catch (err) {
      console.error("Failed to load series dossier", err);
      setError(apiErrorMessage(err, "Không thể tải hồ sơ bảo vệ series."));
    } finally {
      setLoading(false);
    }
  }

  async function submitReport() {
    if (!seriesId || !content.trim()) return;
    setSubmitting(true);
    try {
      const response = await api.post<DefenseReport>(
        `/series/${seriesId}/defense-reports`,
        { content },
      );
      setDossier((prev) =>
        prev
          ? {
              ...prev,
              defenseReports: [response.data, ...prev.defenseReports],
            }
          : prev,
      );
      setContent("");
      toast.success("Đã gửi báo cáo bảo vệ.");
    } catch (err) {
      console.error("Failed to submit defense report", err);
      setError(apiErrorMessage(err, "Không thể gửi báo cáo bảo vệ."));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitDecision() {
    if (!seriesId || !decisionReason.trim()) return;
    setDeciding(true);
    try {
      await api.post("/decisions", {
        seriesId: Number(seriesId),
        decisionType,
        newFrequency:
          decisionType === "CHANGE_FREQUENCY" ? newFrequency : undefined,
        reason: decisionReason,
      });
      toast.success("Đã ghi nhận quyết định của Hội đồng.");
      setDecisionReason("");
    } catch (err) {
      console.error("Failed to submit board decision", err);
      setError(apiErrorMessage(err, "Không thể ra quyết định cho series."));
    } finally {
      setDeciding(false);
    }
  }

  const chartData = useMemo(
    () =>
      (dossier?.rankingHistory || []).map((point) => ({
        label: date(point.periodEndDate),
        score: num(point.totalScore),
        rank: num(point.rankPosition),
        risk: point.riskLevel,
      })),
    [dossier],
  );

  if (loading) {
    return <div className="p-8 text-sm text-muted">Đang tải hồ sơ bảo vệ…</div>;
  }

  if (error) {
    return (
      <div className="space-y-4 p-8">
        <Link to="/editor/series" className="text-sm text-muted hover:text-accent">
          ← Quay lại series quản lý
        </Link>
        <Panel className="border-danger/20 bg-danger/10 p-5 text-danger">
          {error}
        </Panel>
      </div>
    );
  }

  if (!dossier || dossier.series.status !== "HIATUS") {
    return (
      <div className="space-y-4 p-8">
        <Link to="/editor/series" className="text-sm text-muted hover:text-accent">
          ← Quay lại series quản lý
        </Link>
        <Panel className="p-6 text-center text-muted">
          Hồ sơ bảo vệ chỉ khả dụng khi series đang tạm dừng (HIATUS).
        </Panel>
      </div>
    );
  }

  const isBoard = user?.role === Role.EDITORIAL_BOARD;
  const isTantou = user?.role === Role.TANTOU_EDITOR;
  const backTo = isBoard ? "/board/reader-votes/import" : "/editor/series";

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to={backTo}
            className="inline-flex items-center gap-2 text-sm text-muted hover:text-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Link>
          <p className="mt-5 font-mono text-xs uppercase tracking-wider text-accent">
            Series Defense Dossier
          </p>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-3xl text-ink">{dossier.series.title}</h1>
            <Stamp status="HIATUS" />
          </div>
          <p className="mt-2 text-sm text-muted">
            Hồ sơ số liệu và báo cáo bảo vệ khi series đang tạm dừng.
          </p>
        </div>
        <Panel className="px-4 py-3">
          <div className="font-mono text-[0.62rem] uppercase tracking-wider text-ink-soft">
            Tần suất
          </div>
          <div className="mt-1 text-lg font-semibold text-ink">
            {dossier.series.frequency}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Đúng hạn"
          value={`${dossier.publicationStats.onTimeRate}%`}
          hint={`${dossier.publicationStats.onTimeChapters}/${dossier.publicationStats.scheduledPublishedChapters} chương có lịch`}
        />
        <StatCard
          label="Chapter published"
          value={dossier.publicationStats.publishedChapters}
          hint={`${dossier.publicationStats.lateChapters} chương trễ lịch`}
        />
        <StatCard
          label="Task đúng hạn"
          value={`${dossier.taskStats.approvedOnTimeRate}%`}
          hint={`${dossier.taskStats.approvedOnTimeTasks}/${dossier.taskStats.approvedTasks} task approved`}
        />
        <StatCard
          label="Revision trung bình"
          value={dossier.taskStats.averageRevisionsPerTask}
          hint={`${dossier.taskStats.revisionRequiredCount} lần yêu cầu sửa`}
        />
      </div>

      <Panel className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl text-ink">Xu hướng xếp hạng</h2>
            <p className="mt-1 text-sm text-muted">
              Số sao độc giả từ file CSV đã import.
            </p>
          </div>
        </div>
        {chartData.length === 0 ? (
          <EmptyState title="Chưa có lịch sử ranking đã đóng." />
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="label" stroke="currentColor" tickLine={false} />
                <YAxis stroke="currentColor" tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-line)",
                    color: "var(--color-ink)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="var(--color-accent)"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  name="Sao độc giả"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Panel className="p-5">
          <h2 className="text-2xl text-ink">Lịch sử quyết định</h2>
          <div className="mt-4 space-y-4">
            {dossier.decisions.length === 0 ? (
              <p className="text-sm text-muted">Chưa có quyết định trước đó.</p>
            ) : (
              dossier.decisions.map((decision) => (
                <div key={decision.id} className="border-l-2 border-accent/40 pl-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Stamp status={decision.type} label={decision.type} />
                    <span className="text-xs text-muted">
                      {date(decision.decidedAt)} · {decision.decidedBy || "Hội đồng"}
                    </span>
                  </div>
                  {decision.newFrequency && (
                    <p className="mt-2 text-sm text-ink">
                      Tần suất mới: {decision.newFrequency}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-muted">{decision.reason}</p>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-accent" />
            <h2 className="text-2xl text-ink">Báo cáo bảo vệ</h2>
          </div>
          <div className="mt-4 space-y-4">
            {dossier.defenseReports.length === 0 ? (
              <p className="text-sm text-muted">Chưa có báo cáo bảo vệ nào.</p>
            ) : (
              dossier.defenseReports.map((report) => (
                <div key={report.id} className="rounded-lg border border-line bg-bg/40 p-4">
                  <div className="mb-2 text-xs text-muted">
                    {report.authorName || "Tantou Editor"} · {date(report.createdAt)}
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-ink">
                    {report.content}
                  </p>
                </div>
              ))
            )}
          </div>

          {isTantou && (
          <div className="mt-5 border-t border-line pt-5">
            <label className="font-semibold text-ink" htmlFor="defense-report">
              Viết báo cáo mới
            </label>
            <textarea
              id="defense-report"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={6}
              className="mt-3 w-full rounded-[var(--app-radius)] border border-line bg-bg px-4 py-3 text-sm text-ink outline-none transition focus:border-accent"
              placeholder="Tóm tắt lý do series còn tiềm năng: phản hồi độc giả, kế hoạch cải thiện tiến độ, hướng nội dung tiếp theo..."
            />
            <div className="mt-3 flex justify-end">
              <Button
                onClick={submitReport}
                disabled={!content.trim() || submitting}
                loading={submitting}
              >
                <Send className="h-4 w-4" />
                Gửi báo cáo
              </Button>
            </div>
          </div>
          )}

          {isBoard && (
            <div className="mt-5 border-t border-line pt-5">
              <h3 className="font-semibold text-ink">Board ra quyết định</h3>
              <p className="mt-1 text-sm text-muted">
                Đọc báo cáo bảo vệ rồi chọn hướng xử lý trạng thái series.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-[180px_180px_1fr]">
                <select
                  value={decisionType}
                  onChange={(event) => setDecisionType(event.target.value as DecisionType)}
                  className="rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                >
                  <option value="CONTINUE">Tiếp tục</option>
                  <option value="CHANGE_FREQUENCY">Đổi tần suất</option>
                  <option value="HIATUS">Giữ tạm dừng</option>
                  <option value="CANCEL">Hủy series</option>
                </select>
                <select
                  value={newFrequency}
                  onChange={(event) => setNewFrequency(event.target.value as FrequencyType)}
                  disabled={decisionType !== "CHANGE_FREQUENCY"}
                  className="rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-accent disabled:opacity-50"
                >
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
                <input
                  value={decisionReason}
                  onChange={(event) => setDecisionReason(event.target.value)}
                  className="rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                  placeholder="Lý do quyết định..."
                />
              </div>
              <div className="mt-3 flex justify-end">
                <Button
                  onClick={submitDecision}
                  disabled={!decisionReason.trim() || deciding}
                  loading={deciding}
                >
                  Ra quyết định
                </Button>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

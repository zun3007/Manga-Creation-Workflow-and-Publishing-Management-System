import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { useToast } from "../../components/ui/Toast";
import { Panel } from "../../components/ui/Panel";
import { Stamp } from "../../components/ui/Stamp";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import type { SeriesItem, ChapterItem } from "../../types";
import type { ChapterStatus } from "@manga/shared";

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

// Mangaka lifecycle actions: maps current status to the next status the MANGAKA
// may drive. Editor approval, board approval and publishing are NOT mangaka
// actions (they happen on the editor/board screens), so those stages are shown
// as read-only status hints (WAITING_LABEL) rather than action buttons.
const NEXT: Record<string, { to: ChapterStatus; label: string } | undefined> = {
  DRAFT: { to: "IN_PROGRESS" as ChapterStatus, label: "Bắt đầu vẽ" },
  IN_PROGRESS: { to: "READY_FOR_EDITOR_REVIEW" as ChapterStatus, label: "Gửi duyệt biên tập" },
};

// Read-only labels for stages the mangaka is waiting on (no action button).
const WAITING_LABEL: Record<string, string | undefined> = {
  READY_FOR_EDITOR_REVIEW: "Đang chờ biên tập",
  EDITOR_APPROVED: "Chờ hội đồng duyệt",
  BOARD_APPROVED: "Chờ lên lịch xuất bản",
  PUBLISHED: "Đã xuất bản",
};

export default function SeriesDetail() {
  const navigate = useNavigate();
  const toast = useToast();
  const { id } = useParams<{ id: string }>();
  const seriesId = Number(id);

  const [series, setSeries] = useState<SeriesItem | null>(null);
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Chapter form state
  const [formTitle, setFormTitle] = useState("");
  const [formDeadline, setFormDeadline] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Chapter lifecycle state
  const [savingId, setSavingId] = useState<number | null>(null);
  const [lifecycleError, setLifecycleError] = useState<{ chapterId: number; message: string } | null>(null);

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const [seriesRes, chaptersRes] = await Promise.all([
        api.get(`/series/${seriesId}`),
        api.get(`/chapters?seriesId=${seriesId}`),
      ]);
      setSeries(seriesRes.data);
      setChapters(chaptersRes.data || []);
    } catch (e) {
      console.error("Failed to load series detail", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (seriesId) load();
  }, [seriesId]);

  async function handleCreateChapter(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim()) {
      setSubmitError("Tiêu đề chương không được để trống");
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    try {
      const payload: any = {
        seriesId,
        title: formTitle.trim(),
      };
      if (formDeadline) payload.deadline = new Date(formDeadline).toISOString();

      const res = await api.post("/chapters", payload);
      // Prepend new chapter to list
      const newChapter = res.data;
      setChapters([newChapter, ...chapters]);
      toast.success('Đã tạo chương.');
      // Reset form
      setFormTitle("");
      setFormDeadline("");
    } catch (e) {
      console.error("Failed to create chapter", e);
      setSubmitError("Không thể tạo chương. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  const handleSelectChapter = (chapterId: number) => {
    navigate(`/series/${seriesId}/chapters/${chapterId}`);
  };

  const handleUpdateChapterStatus = async (chapterId: number, newStatus: ChapterStatus) => {
    setSavingId(chapterId);
    setLifecycleError(null);
    const previousChapters = chapters;
    try {
      // Optimistic update: update the chapter's status in local state
      setChapters((prev) =>
        prev.map((ch) => (ch.id === chapterId ? { ...ch, status: newStatus } : ch))
      );
      await api.patch(`/chapters/${chapterId}/status`, { status: newStatus });
      toast.success('Đã cập nhật chương.');
    } catch (e) {
      console.error("Failed to update chapter status", e);
      // Revert to previous state
      setChapters(previousChapters);
      setLifecycleError({
        chapterId,
        message: "Không thể cập nhật trạng thái. Vui lòng thử lại.",
      });
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="grid h-[60vh] place-items-center p-8">
        <span className="font-mono text-xs uppercase tracking-wider animate-pulse text-ink-soft">
          Đang tải series…
        </span>
      </div>
    );
  }

  if (error || !series) {
    return (
      <div className="grid h-[60vh] place-items-center p-8">
        <Panel className="p-6 text-center">
          <p className="text-ink">Không tải được series.</p>
          <Button className="mt-4" onClick={() => navigate("/series")}>
            Quay lại
          </Button>
        </Panel>
      </div>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-bg/95 px-8 py-5 backdrop-blur">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/series")}
            className="px-3 py-2 text-ink-soft hover:text-ink transition"
          >
            ← Quay lại
          </button>
          <div>
            <h1 className="text-3xl text-ink">{series.title}</h1>
            <p className="font-mono text-[0.62rem] uppercase tracking-wider text-ink-soft mt-1">
              {series.frequency}
              {series.genres ? ` · ${series.genres}` : ""}
            </p>
          </div>
          <div className="ml-auto">
            <Stamp status={series.status} />
          </div>
        </div>
      </header>

      <div className="space-y-8 p-8">
        {/* Series info */}
        <Panel className="p-6">
          <h2 className="font-mono text-[0.62rem] uppercase tracking-wider text-ink-soft mb-4">Thông tin Series</h2>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <div>
              <p className="font-mono text-[0.62rem] uppercase tracking-wider text-ink-soft">Tần suất</p>
              <p className="mt-1 text-lg font-semibold text-ink">{series.frequency}</p>
            </div>
            <div>
              <p className="font-mono text-[0.62rem] uppercase tracking-wider text-ink-soft">Trạng thái</p>
              <p className="mt-1">
                <Stamp status={series.status} />
              </p>
            </div>
            <div>
              <p className="font-mono text-[0.62rem] uppercase tracking-wider text-ink-soft">Tổng chương</p>
              <p className="mt-1 text-lg font-semibold text-ink">{series.chapters}</p>
            </div>
            {series.genres && (
              <div>
                <p className="font-mono text-[0.62rem] uppercase tracking-wider text-ink-soft">Thể loại</p>
                <p className="mt-1 text-sm text-ink">{series.genres}</p>
              </div>
            )}
          </div>
        </Panel>

        {/* Create chapter form */}
        <Panel className="p-6">
          <h2 className="font-mono text-[0.62rem] uppercase tracking-wider text-ink-soft mb-4">Chương mới</h2>
          <form onSubmit={handleCreateChapter} className="space-y-4">
            <Input
              label="Tiêu đề chương"
              placeholder="e.g. Tập 1 — Cuộc gặp gỡ"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              disabled={submitting}
            />
            <div>
              <label className="block">
                <span className="mb-1 block font-mono text-[0.62rem] uppercase tracking-wider text-ink-soft">
                  Hạn chót (không bắt buộc)
                </span>
                <input
                  type="date"
                  value={formDeadline}
                  onChange={(e) => setFormDeadline(e.target.value)}
                  disabled={submitting}
                  className="w-full rounded-[calc(var(--app-radius)*0.6)] border border-line bg-surface px-3 py-2 text-ink outline-none transition focus:border-accent disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </label>
            </div>
            {submitError && <p className="text-danger text-sm">{submitError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="soft" type="button" onClick={() => { setFormTitle(""); setFormDeadline(""); }}>
                Xóa
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Đang tạo…" : "Tạo chương"}
              </Button>
            </div>
          </form>
        </Panel>

        {/* Chapters list */}
        <section>
          <h2 className="mb-4 text-2xl">Chương</h2>
          {chapters.length === 0 ? (
            <Panel className="p-6 text-center text-ink-soft">Chưa có chương nào.</Panel>
          ) : (
            <div className="space-y-2">
              {chapters.map((ch) => {
                const action = NEXT[ch.status];
                const isError = lifecycleError?.chapterId === ch.id;

                return (
                  <div key={ch.id}>
                    <button
                      onClick={() => handleSelectChapter(ch.id)}
                      className="w-full text-left transition hover:-translate-x-0.5 hover:-translate-y-0.5"
                    >
                      <Panel className="flex items-center justify-between gap-4 p-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold text-ink">
                              Chương {ch.number}: {ch.title}
                            </h3>
                            <Stamp status={ch.status} />
                          </div>
                          <p className="font-mono text-[0.62rem] uppercase tracking-wider text-ink-soft mt-1">
                            {ch.pages} trang{ch.deadline ? ` · Hạn: ${fmtDate(ch.deadline)}` : ""}
                          </p>
                        </div>
                        <div className="hidden sm:flex items-center gap-4">
                          {action ? (
                            <Button
                              variant="accent"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateChapterStatus(ch.id, action.to);
                              }}
                              disabled={savingId === ch.id}
                              className="whitespace-nowrap"
                            >
                              {savingId === ch.id ? "Đang cập nhật…" : action.label}
                            </Button>
                          ) : WAITING_LABEL[ch.status] ? (
                            <span className="text-ink-soft font-mono text-xs">
                              {WAITING_LABEL[ch.status]}
                            </span>
                          ) : null}
                          <div className="text-ink-soft font-mono text-xs">→</div>
                        </div>
                      </Panel>
                    </button>
                    {isError && (
                      <p className="text-danger text-sm px-4 py-2">{lifecycleError.message}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

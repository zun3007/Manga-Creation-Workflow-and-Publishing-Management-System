import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { SubmissionStatus } from "@manga/shared";
import type { SubmissionItem } from "../../types";
import { Panel } from "../../components/ui/Panel";
import { Button } from "../../components/ui/Button";
import { Avatar } from "../../components/ui/Avatar";
import { Stamp } from "../../components/ui/Stamp";

interface ToastMsg {
  id: string;
  text: string;
  type: "ok" | "error";
}

export default function ReviewQueue() {
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState<Record<number, boolean>>({});

  async function loadQueue() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/submissions/review-queue");
      const items = res.data || [];
      // Defensive normalization: ensure status is an enum value
      const normalized = items.map((item: any) => ({
        ...item,
        status: item.status as SubmissionStatus,
      }));
      setSubmissions(normalized);
    } catch (err: any) {
      console.error("Failed to load review queue", err);
      setError(err?.response?.data?.message || "Không tải được hàng chờ duyệt");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQueue();
  }, []);

  const showToast = (text: string, type: "ok" | "error" = "ok") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const handleApprove = async (id: number) => {
    setSubmitting((prev) => ({ ...prev, [id]: true }));
    try {
      await api.patch(`/submissions/${id}/review`, {
        decision: SubmissionStatus.APPROVED,
      });
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
      showToast("✓ Đã duyệt", "ok");
    } catch (err: any) {
      console.error("Approve failed", err);
      showToast(err?.response?.data?.message || "Duyệt thất bại", "error");
    } finally {
      setSubmitting((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleRevisionRequest = async (id: number) => {
    const fb = feedback[id]?.trim();
    if (!fb) {
      showToast("Vui lòng nhập phản hồi", "error");
      return;
    }
    setSubmitting((prev) => ({ ...prev, [id]: true }));
    try {
      await api.patch(`/submissions/${id}/review`, {
        decision: SubmissionStatus.REVISION_REQUIRED,
        feedback: fb,
      });
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
      setFeedback((prev) => ({ ...prev, [id]: "" }));
      setExpandedId(null);
      showToast("✓ Đã yêu cầu sửa", "ok");
    } catch (err: any) {
      console.error("Revision request failed", err);
      showToast(err?.response?.data?.message || "Yêu cầu sửa thất bại", "error");
    } finally {
      setSubmitting((prev) => ({ ...prev, [id]: false }));
    }
  };

  const isImageUrl = (url?: string): boolean => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(lower);
  };

  const formatDate = (dateStr: string): string => {
    try {
      return new Date(dateStr).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="grid h-[60vh] place-items-center p-8">
        <span className="font-mono text-xs uppercase tracking-wider animate-pulse text-ink-soft">
          Đang tải hàng chờ…
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid h-[60vh] place-items-center p-8">
        <Panel className="p-6 text-center">
          <p className="text-ink">{error}</p>
          <Button className="mt-4" onClick={loadQueue}>
            Thử lại
          </Button>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div>
        <div className="flex items-end justify-between mb-4">
          <h1 className="text-3xl">Chờ duyệt</h1>
          <span className="font-mono text-[0.62rem] uppercase tracking-wider text-ink-soft">
            {submissions.length} bài
          </span>
        </div>
      </div>

      {/* Queue */}
      {submissions.length === 0 ? (
        <Panel className="p-8 text-center">
          <p className="text-ink-soft">Sạch sẽ — không có bài chờ duyệt.</p>
        </Panel>
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => (
            <Panel key={sub.id} className="p-5">
              <div className="flex flex-col gap-4">
                {/* Row 1: Avatar, task info, status */}
                <div className="flex items-start gap-4">
                  <Avatar url={sub.assistantAvatar ?? null} name={sub.assistant || "—"} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-ink">{sub.task || "—"}</h3>
                      <Stamp status={sub.status} />
                    </div>
                    <p className="font-mono text-[0.62rem] uppercase tracking-wider text-ink-soft mt-1">
                      {sub.assistant || "—"} · Nộp lúc {formatDate(sub.submittedAt)}
                    </p>
                  </div>
                </div>

                {/* Row 2: File preview (if image) or link */}
                {sub.fileUrl && (
                  <div className="border-t border-line pt-4">
                    {isImageUrl(sub.fileUrl) ? (
                      <img
                        src={sub.fileUrl}
                        alt="Bài nộp"
                        className="max-h-48 w-auto rounded-lg border border-line object-contain"
                      />
                    ) : (
                      <a
                        href={sub.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 font-semibold text-accent hover:underline"
                      >
                        → Xem bài nộp
                      </a>
                    )}
                  </div>
                )}

                {/* Row 3: Actions */}
                <div className="border-t border-line pt-4 flex flex-col gap-3">
                  {expandedId === sub.id ? (
                    <>
                      <textarea
                        value={feedback[sub.id] || ""}
                        onChange={(e) => setFeedback((prev) => ({ ...prev, [sub.id]: e.target.value }))}
                        placeholder="Nhập phản hồi/yêu cầu sửa..."
                        className="w-full rounded-lg border border-line bg-bg p-3 text-sm text-ink placeholder-ink-soft focus:outline-none focus:ring-2 focus:ring-accent"
                        rows={3}
                        disabled={submitting[sub.id]}
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="accent"
                          className="flex-1"
                          onClick={() => handleRevisionRequest(sub.id)}
                          disabled={submitting[sub.id]}
                        >
                          {submitting[sub.id] ? "Đang xử lý…" : "Gửi yêu cầu"}
                        </Button>
                        <Button
                          variant="soft"
                          className="flex-1"
                          onClick={() => {
                            setExpandedId(null);
                            setFeedback((prev) => ({ ...prev, [sub.id]: "" }));
                          }}
                          disabled={submitting[sub.id]}
                        >
                          Hủy
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="accent"
                        className="flex-1"
                        onClick={() => handleApprove(sub.id)}
                        disabled={submitting[sub.id]}
                      >
                        {submitting[sub.id] ? "Đang xử lý…" : "Duyệt"}
                      </Button>
                      <Button
                        variant="soft"
                        className="flex-1"
                        onClick={() => setExpandedId(sub.id)}
                        disabled={submitting[sub.id]}
                      >
                        Yêu cầu sửa
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Panel>
          ))}
        </div>
      )}

      {/* Toast notifications */}
      <div className="fixed bottom-4 right-4 space-y-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-lg px-4 py-3 text-sm font-semibold pointer-events-auto ${
              t.type === "ok"
                ? "bg-ok/15 text-ok border border-ok/30"
                : "bg-danger/15 text-danger border border-danger/30"
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}

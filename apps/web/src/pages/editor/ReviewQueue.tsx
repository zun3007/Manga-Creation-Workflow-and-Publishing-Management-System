import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { EditorChapter } from "../../types";
import { api } from "../../lib/api";
import { Panel } from "../../components/ui/Panel";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";

export default function ReviewQueue() {
  const navigate = useNavigate();
  const [chapters, setChapters] = useState<EditorChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revisingId, setRevisingId] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadChapters();
  }, []);

  async function loadChapters() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get<EditorChapter[]>("/chapters/review-queue");
      setChapters(res.data || []);
    } catch (e) {
      console.error("Failed to load review queue", e);
      setError("Không thể tải danh sách chương cần duyệt. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  async function decide(
    id: number,
    decision: "APPROVE" | "REVISE",
    feedback?: string
  ) {
    setSubmitting(true);
    try {
      await api.patch(`/chapters/${id}/editor-review`, {
        decision,
        ...(feedback ? { feedback } : {}),
      });
      // Remove the chapter from the list on success
      setChapters((prev) => prev.filter((c) => c.id !== id));
      setRevisingId(null);
      setFeedbackText("");
    } catch (e) {
      console.error("Failed to submit review decision", e);
      alert("Không thể lưu quyết định. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl mb-6 text-ink">Duyệt chương</h1>
        <Panel className="mt-4 p-6 text-ink-soft">Đang tải…</Panel>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl mb-6 text-ink">Duyệt chương</h1>

      {error && (
        <Panel className="mb-6 p-4 text-red-600 bg-red-50 border-red-200">
          {error}
        </Panel>
      )}

      {chapters.length === 0 ? (
        <EmptyState title="Không có chương nào chờ duyệt." />
      ) : (
        <div className="grid gap-4">
          {chapters.map((chapter) => (
            <Panel key={chapter.id} className="p-6">
              {/* Header with series, chapter number, and title */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-ink-soft text-sm">
                      {chapter.series}
                    </span>
                    <span className="text-ink-soft">·</span>
                    <span className="text-ink-soft text-sm">
                      Chương {chapter.number}
                    </span>
                    <span className="text-ink-soft">·</span>
                    <span className="font-semibold text-ink">
                      {chapter.title}
                    </span>
                  </div>

                  {/* Metadata: pages and deadline */}
                  <div className="text-sm text-ink-soft space-y-1">
                    <p>{chapter.pages} trang</p>
                    {chapter.deadline && (
                      <p>
                        Hạn chót:{" "}
                        {new Date(chapter.deadline).toLocaleDateString(
                          "vi-VN"
                        )}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                {revisingId !== chapter.id && (
                  <div className="flex flex-col gap-2 min-w-max">
                    <Button
                      variant="soft"
                      onClick={() => navigate(`/editor/review/${chapter.id}`)}
                      disabled={submitting}
                    >
                      Xem & duyệt
                    </Button>
                    <Button
                      variant="accent"
                      onClick={() => decide(chapter.id, "APPROVE")}
                      disabled={submitting}
                    >
                      Duyệt
                    </Button>
                    <Button
                      variant="soft"
                      onClick={() => setRevisingId(chapter.id)}
                      disabled={submitting}
                    >
                      Yêu cầu sửa
                    </Button>
                  </div>
                )}
              </div>

              {/* Revise feedback form */}
              {revisingId === chapter.id && (
                <div className="mt-4 p-4 bg-bg rounded border border-line">
                  <label className="block text-sm font-semibold text-ink mb-2">
                    Phản hồi
                  </label>
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    className="w-full rounded border border-line bg-bg p-2 text-ink placeholder-ink-soft focus:outline-none focus:ring-2 focus:ring-accent"
                    rows={4}
                    placeholder="Nhập phản hồi chi tiết..."
                  />
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="accent"
                      onClick={() =>
                        decide(chapter.id, "REVISE", feedbackText)
                      }
                      disabled={submitting || !feedbackText.trim()}
                    >
                      Xác nhận
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setRevisingId(null);
                        setFeedbackText("");
                      }}
                      disabled={submitting}
                    >
                      Hủy
                    </Button>
                  </div>
                </div>
              )}
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}

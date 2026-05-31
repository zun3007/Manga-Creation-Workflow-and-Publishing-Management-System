import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { Panel } from "../../components/ui/Panel";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";

interface EditorPage {
  id: number;
  number: number;
  status: string;
  imageUrl: string;
}

interface Annotation {
  id: number;
  targetType: string;
  targetId: number;
  category: "CONTENT_ISSUE" | "DIALOGUE_ISSUE" | "SCRIPT_ISSUE" | "VISUAL_ISSUE" | "GENERAL";
  context: string;
  x: number | null;
  y: number | null;
  isResolved: 0 | 1;
  createdAt: string;
}

type AnnotationFormState = {
  pageId: number;
  x: number;
  y: number;
} | null;

export default function ChapterReview() {
  const { chapterId } = useParams<{ chapterId: string }>();
  const navigate = useNavigate();

  const [pages, setPages] = useState<EditorPage[]>([]);
  const [annotationsByPageId, setAnnotationsByPageId] = useState<Record<number, Annotation[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [formState, setFormState] = useState<AnnotationFormState>(null);
  const [formCategory, setFormCategory] = useState<Annotation["category"]>("GENERAL");
  const [formContext, setFormContext] = useState("");

  const [feedbackText, setFeedbackText] = useState("");
  const [reviseMode, setReviseMode] = useState(false);
  const imageRefs = useRef<Record<number, HTMLImageElement | null>>({});

  const categoryOptions: Annotation["category"][] = [
    "CONTENT_ISSUE",
    "DIALOGUE_ISSUE",
    "SCRIPT_ISSUE",
    "VISUAL_ISSUE",
    "GENERAL",
  ];

  const categoryLabels: Record<Annotation["category"], string> = {
    CONTENT_ISSUE: "Vấn đề nội dung",
    DIALOGUE_ISSUE: "Vấn đề hội thoại",
    SCRIPT_ISSUE: "Vấn đề kịch bản",
    VISUAL_ISSUE: "Vấn đề hình ảnh",
    GENERAL: "Chung",
  };

  useEffect(() => {
    loadPages();
  }, [chapterId]);

  async function loadPages() {
    if (!chapterId) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.get<EditorPage[]>(`/chapters/${chapterId}/pages`);
      const pageList = res.data || [];
      setPages(pageList);

      // Load annotations for each page
      const annotationMap: Record<number, Annotation[]> = {};
      for (const page of pageList) {
        try {
          const annotRes = await api.get<Annotation[]>("/annotations", {
            params: { targetType: "PAGE", targetId: page.id },
          });
          annotationMap[page.id] = annotRes.data || [];
        } catch (e) {
          console.error(`Failed to load annotations for page ${page.id}`, e);
          annotationMap[page.id] = [];
        }
      }
      setAnnotationsByPageId(annotationMap);
    } catch (e) {
      console.error("Failed to load pages", e);
      setError("Không thể tải trang của chương. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  function handleImageClick(
    e: React.MouseEvent<HTMLImageElement>,
    pageId: number
  ) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setFormState({ pageId, x, y });
    setFormCategory("GENERAL");
    setFormContext("");
  }

  async function handleSubmitAnnotation() {
    if (!formState || !formContext.trim()) return;

    setSubmitting(true);
    try {
      const payload = {
        targetType: "PAGE" as const,
        targetId: formState.pageId,
        category: formCategory,
        context: formContext.trim(),
        x: formState.x,
        y: formState.y,
      };
      await api.post("/annotations", payload);

      // Add to local state
      setAnnotationsByPageId((prev) => ({
        ...prev,
        [formState.pageId]: [
          ...(prev[formState.pageId] || []),
          {
            id: 0, // temporary; real id comes from backend
            targetType: "PAGE",
            targetId: formState.pageId,
            category: formCategory,
            context: formContext,
            x: formState.x,
            y: formState.y,
            isResolved: 0,
            createdAt: new Date().toISOString(),
          },
        ],
      }));

      setFormState(null);
      setFormContext("");
    } catch (e) {
      console.error("Failed to save annotation", e);
      setError("Không thể lưu góp ý. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResolveAnnotation(annotationId: number, pageId: number) {
    setSubmitting(true);
    try {
      await api.patch(`/annotations/${annotationId}/resolve`);

      // Update local state
      setAnnotationsByPageId((prev) => ({
        ...prev,
        [pageId]: (prev[pageId] || []).map((a) =>
          a.id === annotationId ? { ...a, isResolved: 1 } : a
        ),
      }));
    } catch (e) {
      console.error("Failed to resolve annotation", e);
      setError("Không thể đánh dấu đã xử lý. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove() {
    if (!chapterId) return;
    setSubmitting(true);
    try {
      await api.patch(`/chapters/${chapterId}/editor-review`, {
        decision: "APPROVE",
      });
      navigate("/editor/review");
    } catch (e) {
      console.error("Failed to approve chapter", e);
      setError("Không thể lưu quyết định duyệt. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevise() {
    if (!chapterId || !feedbackText.trim()) return;
    setSubmitting(true);
    try {
      await api.patch(`/chapters/${chapterId}/editor-review`, {
        decision: "REVISE",
        feedback: feedbackText.trim(),
      });
      navigate("/editor/review");
    } catch (e) {
      console.error("Failed to revise chapter", e);
      setError("Không thể lưu yêu cầu sửa. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl mb-6 text-ink">Duyệt chương — đọc trang</h1>
        <Panel className="mt-4 p-6 text-ink-soft">Đang tải…</Panel>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl text-ink">Duyệt chương — đọc trang</h1>
        <Button variant="ghost" onClick={() => navigate("/editor/review")}>
          ← Quay lại
        </Button>
      </div>

      {error && (
        <Panel className="mb-6 p-4 text-red-600 bg-red-50 border-red-200">
          {error}
        </Panel>
      )}

      {pages.length === 0 ? (
        <EmptyState title="Chương chưa có trang." />
      ) : (
        <div className="grid gap-6">
          {/* Pages list with annotation form */}
          <div className="space-y-6">
            {pages.map((page) => (
              <Panel key={page.id} className="p-6">
                <div className="flex gap-6">
                  {/* Left: Image with click handler */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-ink-soft mb-4">
                      Trang {page.number}
                    </h3>
                    <div className="relative inline-block w-full">
                      <img
                        ref={(el) => {
                          if (el) imageRefs.current[page.id] = el;
                        }}
                        src={page.imageUrl}
                        alt={`Trang ${page.number}`}
                        className="w-full rounded border border-line cursor-pointer hover:opacity-90 transition"
                        onClick={(e) => handleImageClick(e, page.id)}
                      />

                      {/* Render annotation markers */}
                      {(annotationsByPageId[page.id] || [])
                        .filter((a) => a.x !== null && a.y !== null)
                        .map((annot, idx) => (
                          <div
                            key={annot.id || idx}
                            className="absolute w-6 h-6 bg-accent text-white rounded-full flex items-center justify-center text-xs font-bold cursor-pointer hover:brightness-95 transition"
                            style={{
                              left: `${annot.x}%`,
                              top: `${annot.y}%`,
                              transform: "translate(-50%, -50%)",
                            }}
                            title={annot.context}
                            onClick={() => {
                              // Could expand to show detail
                            }}
                          >
                            {idx + 1}
                          </div>
                        ))}
                    </div>

                    {/* Inline annotation form if this page is selected */}
                    {formState?.pageId === page.id && (
                      <div className="mt-4 p-4 bg-bg rounded border border-line">
                        <label className="block text-sm font-semibold text-ink mb-2">
                          Loại góp ý
                        </label>
                        <select
                          value={formCategory}
                          onChange={(e) =>
                            setFormCategory(
                              e.target.value as Annotation["category"]
                            )
                          }
                          className="w-full rounded border border-line bg-surface p-2 text-ink focus:outline-none focus:ring-2 focus:ring-accent mb-3"
                        >
                          {categoryOptions.map((cat) => (
                            <option key={cat} value={cat}>
                              {categoryLabels[cat]}
                            </option>
                          ))}
                        </select>

                        <label className="block text-sm font-semibold text-ink mb-2">
                          Nội dung góp ý
                        </label>
                        <textarea
                          value={formContext}
                          onChange={(e) => setFormContext(e.target.value)}
                          className="w-full rounded border border-line bg-surface p-2 text-ink placeholder-ink-soft focus:outline-none focus:ring-2 focus:ring-accent mb-3"
                          rows={3}
                          placeholder="Nhập nội dung góp ý..."
                        />

                        <div className="flex gap-2">
                          <Button
                            variant="accent"
                            onClick={handleSubmitAnnotation}
                            disabled={submitting || !formContext.trim()}
                          >
                            Lưu góp ý
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => setFormState(null)}
                            disabled={submitting}
                          >
                            Hủy
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: Annotations list */}
                  <div className="w-80 shrink-0">
                    <h3 className="text-sm font-semibold text-ink-soft mb-3">
                      Góp ý ({(annotationsByPageId[page.id] || []).length})
                    </h3>
                    {(annotationsByPageId[page.id] || []).length === 0 ? (
                      <p className="text-xs text-ink-soft">Chưa có góp ý nào.</p>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {(annotationsByPageId[page.id] || []).map((annot, idx) => (
                          <div
                            key={annot.id || idx}
                            className={`p-3 rounded border ${
                              annot.isResolved === 1
                                ? "bg-bg border-line opacity-60"
                                : "bg-surface border-accent"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-accent">
                                  {categoryLabels[annot.category]}
                                </p>
                                <p className="text-xs text-ink mt-1 break-words">
                                  {annot.context}
                                </p>
                              </div>
                            </div>
                            {annot.isResolved === 0 && (
                              <Button
                                variant="soft"
                                className="w-full text-xs h-6 px-2 py-1"
                                onClick={() =>
                                  handleResolveAnnotation(annot.id, page.id)
                                }
                                disabled={submitting}
                              >
                                Đã xử lý
                              </Button>
                            )}
                            {annot.isResolved === 1 && (
                              <p className="text-xs text-ink-soft">Đã xử lý</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Panel>
            ))}
          </div>

          {/* Decision bar */}
          <Panel className="p-6 mt-6">
            {!reviseMode ? (
              <div className="flex gap-3 justify-end">
                <Button
                  variant="soft"
                  onClick={() => setReviseMode(true)}
                  disabled={submitting}
                >
                  Yêu cầu sửa
                </Button>
                <Button
                  variant="accent"
                  onClick={handleApprove}
                  disabled={submitting}
                >
                  Duyệt chương
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-ink">
                  Phản hồi cho tác giả
                </label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  className="w-full rounded border border-line bg-bg p-3 text-ink placeholder-ink-soft focus:outline-none focus:ring-2 focus:ring-accent"
                  rows={4}
                  placeholder="Nhập phản hồi chi tiết..."
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setReviseMode(false);
                      setFeedbackText("");
                    }}
                    disabled={submitting}
                  >
                    Hủy
                  </Button>
                  <Button
                    variant="accent"
                    onClick={handleRevise}
                    disabled={submitting || !feedbackText.trim()}
                  >
                    Yêu cầu sửa
                  </Button>
                </div>
              </div>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}

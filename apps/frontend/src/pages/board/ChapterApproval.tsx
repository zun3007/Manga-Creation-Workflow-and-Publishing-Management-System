import { Fragment, useCallback, useEffect, useState } from "react";
import { api, apiErrorMessage } from "../../lib/api";
import { Panel } from "../../components/ui/Panel";
import { Button } from "../../components/ui/Button";
import { Stamp } from "../../components/ui/Stamp";

type BoardChapter = {
  id: number;
  number: number;
  title: string;
  status: "EDITOR_APPROVED";
  submittedAt?: string | null;
  deadline?: string | null;
  seriesId: number;
  series: string;
};

type BoardPage = {
  id: number;
  number: number;
  status: string;
  imageUrl?: string | null;
};

type BoardChapterDetail = BoardChapter & {
  pages: BoardPage[];
};

type BoardDecision = "APPROVE" | "REJECT";

type ReviewForm = {
  chapterId: number;
  decision: BoardDecision;
  feedback: string;
};

type Notice = {
  type: "success" | "error";
  message: string;
};

export default function ChapterApproval() {
  const [chapters, setChapters] = useState<BoardChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detailLoadingId, setDetailLoadingId] = useState<number | null>(null);
  const [details, setDetails] = useState<Record<number, BoardChapterDetail>>({});
  const [detailErrors, setDetailErrors] = useState<Record<number, string>>({});
  const [reviewForm, setReviewForm] = useState<ReviewForm | null>(null);
  const [reviewError, setReviewError] = useState("");

  const loadChapters = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get<BoardChapter[]>(
        "/chapters/board-review-queue",
      );

      setChapters(response.data ?? []);
    } catch (err) {
      setError(
        apiErrorMessage(
          err,
          "Không thể tải danh sách chương chờ Hội đồng phê duyệt",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadChapters();
  }, [loadChapters]);

  async function loadDetail(chapterId: number) {
    if (details[chapterId] || detailLoadingId === chapterId) {
      return;
    }

    setDetailLoadingId(chapterId);
    setDetailErrors((current) => ({ ...current, [chapterId]: "" }));

    try {
      const response = await api.get<BoardChapterDetail>(
        `/chapters/${chapterId}/board-review-detail`,
      );

      setDetails((current) => ({
        ...current,
        [chapterId]: response.data,
      }));
    } catch (err) {
      setDetailErrors((current) => ({
        ...current,
        [chapterId]: apiErrorMessage(err, "Không thể tải chi tiết chương"),
      }));
    } finally {
      setDetailLoadingId(null);
    }
  }

  function toggleDetail(chapterId: number) {
    if (expandedId === chapterId && reviewForm?.chapterId !== chapterId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(chapterId);
    void loadDetail(chapterId);
  }

  function openReview(chapterId: number, decision: BoardDecision) {
    setExpandedId(chapterId);
    setReviewError("");
    setReviewForm({ chapterId, decision, feedback: "" });
    void loadDetail(chapterId);
  }

  function closeReview() {
    setReviewForm(null);
    setReviewError("");
  }

  async function reviewChapter(chapter: BoardChapter) {
    if (!reviewForm || reviewForm.chapterId !== chapter.id) {
      return;
    }

    const feedback = reviewForm.feedback.trim();

    if (reviewForm.decision === "REJECT" && !feedback) {
      setReviewError("Vui lòng nhập lý do từ chối.");
      return;
    }

    setProcessingId(chapter.id);
    setReviewError("");
    setNotice(null);

    try {
      await api.patch(`/chapters/${chapter.id}/board-review`, {
        decision: reviewForm.decision,
        feedback: feedback || undefined,
      });

      setNotice({
        type: "success",
        message:
          reviewForm.decision === "APPROVE"
            ? `Đã chấp nhận Chapter ${chapter.number} - ${chapter.title}.`
            : `Đã từ chối Chapter ${chapter.number} - ${chapter.title} và gửi yêu cầu chỉnh sửa.`,
      });

      setChapters((current) =>
        current.filter((item) => item.id !== chapter.id),
      );
      setDetails((current) => {
        const next = { ...current };
        delete next[chapter.id];
        return next;
      });
      setExpandedId(null);
      setReviewForm(null);
    } catch (err) {
      setReviewError(
        apiErrorMessage(
          err,
          reviewForm.decision === "APPROVE"
            ? "Không thể chấp nhận chương"
            : "Không thể từ chối chương",
        ),
      );
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-8">
      <div>
        <h1 className="text-3xl text-ink">
          Phê duyệt chương
        </h1>

        <p className="mt-2 text-sm text-muted">
          Hội đồng xem xét các chương đã được biên tập viên duyệt trước khi cho
          phép lên lịch xuất bản.
        </p>
      </div>

      {notice && (
        <div
          className={
            notice.type === "error"
              ? "rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger"
              : "rounded-lg border border-accent/30 bg-accent/5 p-4 text-sm text-ink"
          }
          role="status"
        >
          {notice.message}
        </div>
      )}

      <Panel className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-5 sm:px-8 sm:py-6">
          <h2 className="font-display text-lg text-ink">
            Chương đang chờ Hội đồng đánh giá
          </h2>

          <Button
            variant="ghost"
            onClick={() => void loadChapters()}
            disabled={loading || processingId !== null}
          >
            Tải lại
          </Button>
        </div>

        <div className="p-4 sm:p-8">
          {error && (
            <div className="mb-6 rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
              {error}
            </div>
          )}

          {loading ? (
            <p className="py-10 text-center text-sm text-muted">
              Đang tải danh sách chương...
            </p>
          ) : chapters.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-medium text-ink">
                Không có chương nào đang chờ phê duyệt
              </p>

              <p className="mt-2 text-sm text-muted">
                Các chương phải được biên tập viên duyệt trước khi xuất hiện tại
                đây.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full text-sm">
                <thead className="bg-bg">
                  <tr className="border-b border-line text-left">
                    <th className="px-4 py-4 font-semibold">Chương</th>
                    <th className="px-4 py-4 font-semibold">Series</th>
                    <th className="px-4 py-4 font-semibold">Ngày gửi</th>
                    <th className="px-4 py-4 font-semibold">Trạng thái</th>
                    <th className="px-4 py-4 font-semibold">Quyết định</th>
                  </tr>
                </thead>

                <tbody>
                  {chapters.map((chapter) => {
                    const processing = processingId === chapter.id;
                    const expanded = expandedId === chapter.id;
                    const detail = details[chapter.id];
                    const activeReview =
                      reviewForm?.chapterId === chapter.id ? reviewForm : null;

                    return (
                      <Fragment key={chapter.id}>
                        <tr className="border-b border-line">
                          <td className="px-4 py-6 font-medium text-ink">
                            Chapter {chapter.number} - {chapter.title}
                          </td>

                          <td className="px-4 py-6">{chapter.series}</td>

                          <td className="px-4 py-6">
                            {formatDate(chapter.submittedAt ?? chapter.deadline)}
                          </td>

                          <td className="px-4 py-6">
                            <Stamp status="REVIEWING" label="Chờ Hội đồng" />
                          </td>

                          <td className="px-4 py-6">
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="ghost"
                                disabled={processingId !== null}
                                aria-expanded={expanded}
                                aria-controls={`chapter-detail-${chapter.id}`}
                                onClick={() => toggleDetail(chapter.id)}
                              >
                                {expanded ? "Ẩn chi tiết" : "Xem chi tiết"}
                              </Button>

                              <Button
                                disabled={processingId !== null}
                                onClick={() => openReview(chapter.id, "APPROVE")}
                              >
                                Chấp nhận
                              </Button>

                              <Button
                                variant="ghost"
                                disabled={processingId !== null}
                                onClick={() => openReview(chapter.id, "REJECT")}
                              >
                                Từ chối
                              </Button>
                            </div>
                          </td>
                        </tr>

                        {expanded && (
                          <tr id={`chapter-detail-${chapter.id}`}>
                            <td colSpan={5} className="border-b border-line bg-bg p-4 sm:p-6">
                              <div className="space-y-5 rounded-lg border border-line bg-surface p-4 sm:p-6">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <h3 className="font-display text-xl font-semibold text-ink">
                                      Chapter {chapter.number} - {chapter.title}
                                    </h3>
                                    <p className="mt-1 text-sm text-muted">
                                      Series: {chapter.series} · Hạn: {formatDate(chapter.deadline)}
                                    </p>
                                  </div>
                                  <Stamp status="EDITOR_APPROVED" label="Biên tập đã duyệt" />
                                </div>

                                {detailLoadingId === chapter.id ? (
                                  <p className="py-8 text-center text-sm text-muted">
                                    Đang tải nội dung chương...
                                  </p>
                                ) : detailErrors[chapter.id] ? (
                                  <div className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
                                    {detailErrors[chapter.id]}
                                  </div>
                                ) : detail ? (
                                  <div>
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                      <h4 className="font-semibold text-ink">
                                        Nội dung chương
                                      </h4>
                                      <span className="text-xs text-muted">
                                        {detail.pages.length} trang
                                      </span>
                                    </div>

                                    {detail.pages.length === 0 ? (
                                      <p className="rounded-lg border border-line bg-bg p-4 text-sm text-muted">
                                        Chương chưa có trang nào.
                                      </p>
                                    ) : (
                                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                        {detail.pages.map((page) => (
                                          <article
                                            key={page.id}
                                            className="overflow-hidden rounded-lg border border-line bg-bg"
                                          >
                                            {page.imageUrl ? (
                                              <img
                                                src={page.imageUrl}
                                                alt={`Trang ${page.number} của Chapter ${chapter.number}`}
                                                loading="lazy"
                                                className="aspect-[3/4] w-full bg-surface object-contain"
                                              />
                                            ) : (
                                              <div className="flex aspect-[3/4] items-center justify-center bg-surface px-4 text-center text-sm text-muted">
                                                Chưa có ảnh trang
                                              </div>
                                            )}

                                            <div className="flex items-center justify-between gap-2 p-3">
                                              <span className="font-medium text-ink">
                                                Trang {page.number}
                                              </span>
                                              <Stamp status={page.status} />
                                            </div>
                                          </article>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ) : null}

                                {activeReview && (
                                  <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 sm:p-5">
                                    <h4 className="font-semibold text-ink">
                                      {activeReview.decision === "APPROVE"
                                        ? "Xác nhận chấp nhận chương"
                                        : "Từ chối và yêu cầu chỉnh sửa"}
                                    </h4>

                                    {activeReview.decision === "APPROVE" ? (
                                      <p className="mt-2 text-sm text-muted">
                                        Sau khi chấp nhận, chương sẽ chuyển sang trạng thái Hội đồng đã duyệt và có thể được lên lịch xuất bản.
                                      </p>
                                    ) : (
                                      <label className="mt-4 block" htmlFor={`board-feedback-${chapter.id}`}>
                                        <span className="mb-2 block text-sm font-semibold text-ink">
                                          Lý do từ chối
                                        </span>
                                        <textarea
                                          id={`board-feedback-${chapter.id}`}
                                          rows={4}
                                          maxLength={5000}
                                          value={activeReview.feedback}
                                          disabled={processing}
                                          onChange={(event) => {
                                            setReviewError("");
                                            setReviewForm({
                                              ...activeReview,
                                              feedback: event.target.value,
                                            });
                                          }}
                                          placeholder="Nhập nội dung cần tác giả chỉnh sửa..."
                                          className="w-full rounded-lg border border-line bg-surface p-3 text-ink outline-none transition placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/20"
                                        />
                                      </label>
                                    )}

                                    {reviewError && (
                                      <p className="mt-3 text-sm text-danger" role="alert">
                                        {reviewError}
                                      </p>
                                    )}

                                    <div className="mt-4 flex flex-wrap gap-3">
                                      <Button
                                        loading={processing}
                                        disabled={
                                          processingId !== null && !processing
                                        }
                                        onClick={() => void reviewChapter(chapter)}
                                      >
                                        {activeReview.decision === "APPROVE"
                                          ? "Xác nhận chấp nhận"
                                          : "Xác nhận từ chối"}
                                      </Button>

                                      <Button
                                        variant="ghost"
                                        disabled={processingId !== null}
                                        onClick={closeReview}
                                      >
                                        Hủy
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}

function formatDate(value?: string | Date | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

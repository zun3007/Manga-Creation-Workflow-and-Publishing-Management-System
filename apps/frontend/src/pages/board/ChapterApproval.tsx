import { useCallback, useEffect, useState } from "react";
import { api, apiErrorMessage } from "../../lib/api";
import { useToast } from "../../components/ui/Toast";
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

type BoardDecision = "APPROVE" | "REJECT";

export default function ChapterApproval() {
  const toast = useToast();

  const [chapters, setChapters] = useState<BoardChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [error, setError] = useState("");

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

  async function reviewChapter(chapter: BoardChapter, decision: BoardDecision) {
    let feedback = "";

    if (decision === "APPROVE") {
      const confirmed = window.confirm(
        `Chấp nhận Chapter ${chapter.number} - ${chapter.title}?`,
      );

      if (!confirmed) {
        return;
      }
    } else {
      const enteredFeedback = window.prompt(
        `Nhập lý do từ chối Chapter ${chapter.number} - ${chapter.title}:`,
      );

      if (enteredFeedback === null) {
        return;
      }

      feedback = enteredFeedback.trim();

      if (!feedback) {
        toast.error("Vui lòng nhập lý do từ chối.");
        return;
      }
    }

    setProcessingId(chapter.id);

    try {
      await api.patch(`/chapters/${chapter.id}/board-review`, {
        decision,
        feedback: feedback || undefined,
      });

      toast.success(
        decision === "APPROVE"
          ? "Hội đồng đã chấp nhận chương."
          : "Hội đồng đã từ chối và gửi yêu cầu chỉnh sửa.",
      );

      // Xóa ngay khỏi danh sách vì chương không còn EDITOR_APPROVED.
      setChapters((current) =>
        current.filter((item) => item.id !== chapter.id),
      );
    } catch (err) {
      toast.error(
        apiErrorMessage(
          err,
          decision === "APPROVE"
            ? "Không thể chấp nhận chương"
            : "Không thể từ chối chương",
        ),
      );
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink">
          Phê duyệt chương
        </h1>

        <p className="mt-2 text-sm text-muted">
          Hội đồng xem xét các chương đã được biên tập viên duyệt trước khi cho
          phép lên lịch xuất bản.
        </p>
      </div>

      <Panel className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-8 py-6">
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

        <div className="p-8">
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
              <table className="min-w-full text-sm">
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

                    return (
                      <tr key={chapter.id} className="border-b border-line">
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
                          <div className="flex flex-wrap gap-3">
                            <Button
                              loading={processing}
                              disabled={
                                processingId !== null &&
                                processingId !== chapter.id
                              }
                              onClick={() =>
                                void reviewChapter(chapter, "APPROVE")
                              }
                            >
                              Chấp nhận
                            </Button>

                            <Button
                              variant="ghost"
                              disabled={processingId !== null}
                              onClick={() =>
                                void reviewChapter(chapter, "REJECT")
                              }
                            >
                              Từ chối
                            </Button>
                          </div>
                        </td>
                      </tr>
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

function formatDate(value?: string | null): string {
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

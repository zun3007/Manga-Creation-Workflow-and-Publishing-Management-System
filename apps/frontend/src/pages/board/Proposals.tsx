import { useEffect, useState } from "react";
import { ExternalLink, FileText } from "lucide-react";
import { Role } from "@manga/shared";
import { api, apiErrorMessage } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useToast } from "../../components/ui/Toast";
import { Panel } from "../../components/ui/Panel";
import { Button } from "../../components/ui/Button";
import { Stamp } from "../../components/ui/Stamp";

interface ReviewProposal {
  id: number;
  title: string;
  synopsis: string | null;
  status: string;
  proposedFrequency: string;
  mangakaName: string;
  genres: string | null;
  sampleManuscriptUrl: string | null;
  sampleManuscriptName: string | null;
  reviewNote: string | null;
  decisionNote: string | null;
}

export default function BoardProposals() {
  const { user } = useAuth();
  const toast = useToast();
  const [proposals, setProposals] = useState<ReviewProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [rejectNotes, setRejectNotes] = useState<Record<number, string>>({});
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});

  useEffect(() => {
    loadProposals();
  }, []);

  async function loadProposals() {
    try {
      setLoading(true);
      const res = await api.get("/proposals/review-queue");
      setProposals(res.data);
      setError(null);
    } catch (err) {
      console.error("Failed to load review queue:", err);
      setError("Lỗi khi tải danh sách duyệt");
    } finally {
      setLoading(false);
    }
  }

  async function handleDecision(proposalId: number, decision: "APPROVED" | "REJECTED") {
    const note = rejectNotes[proposalId]?.trim() ?? "";
    if (decision === "REJECTED" && !note) {
      setError("Vui lòng nhập lý do từ chối.");
      toast.error("Vui lòng nhập lý do từ chối.");
      return;
    }

    try {
      setProcessingId(proposalId);
      await api.patch(`/proposals/${proposalId}/decision`, { decision, note });
      setProposals(proposals.filter((p) => p.id !== proposalId));
      if (decision === "APPROVED") {
        toast.success('Đã duyệt đề xuất — series đã được tạo.');
      } else {
        toast.success('Đã từ chối đề xuất.');
      }
    } catch (err: any) {
      console.error(`Failed to ${decision.toLowerCase()} proposal:`, err);
      setError(apiErrorMessage(err, `Lỗi khi xử lý đề xuất`));
    } finally {
      setProcessingId(null);
    }
  }

  async function saveReviewNote(proposalId: number) {
    try {
      setProcessingId(proposalId);
      const { data } = await api.patch(`/proposals/${proposalId}/review-note`, {
        note: reviewNotes[proposalId] ?? "",
      });
      setProposals(proposals.map((p) => (p.id === proposalId ? data : p)));
      toast.success("Đã lưu ghi chú xét duyệt.");
    } catch (err) {
      setError(apiErrorMessage(err, "Không thể lưu ghi chú xét duyệt."));
    } finally {
      setProcessingId(null);
    }
  }

  async function startReview(proposalId: number) {
    try {
      setProcessingId(proposalId);
      const { data } = await api.patch(`/proposals/${proposalId}/start-review`);
      setProposals(proposals.map((p) => (p.id === proposalId ? data : p)));
      toast.success("Đã chuyển đề xuất sang trạng thái xét duyệt.");
    } catch (err) {
      setError(apiErrorMessage(err, "Không thể bắt đầu xét duyệt."));
    } finally {
      setProcessingId(null);
    }
  }

  const isBoard = user?.role === Role.EDITORIAL_BOARD;
  const isTantou = user?.role === Role.TANTOU_EDITOR;

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-3xl text-ink">Duyệt Đề xuất</h1>
        <Panel className="mt-4 p-6 text-ink-soft">Đang tải...</Panel>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl text-ink">Duyệt Đề xuất</h1>

      {error && (
        <Panel className="mt-4 bg-danger/10 border-danger/20 text-danger p-4">
          {error}
        </Panel>
      )}

      <div className="mt-6">
        {proposals.length === 0 ? (
          <Panel className="p-6 text-ink-soft text-center">
            Không có đề xuất nào chờ duyệt
          </Panel>
        ) : (
          <div className="space-y-3">
            {proposals.map((proposal) => (
              <Panel key={proposal.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-ink">
                        {proposal.title}
                      </h3>
                      <Stamp status={proposal.status} />
                    </div>
                    <p className="text-sm text-ink-soft mb-2">
                      <span className="font-semibold">Tác giả:</span> {proposal.mangakaName}
                    </p>
                    {proposal.synopsis && (
                      <p className="text-sm text-ink-soft mb-2">
                        {proposal.synopsis}
                      </p>
                    )}
                    <div className="flex gap-2 items-center flex-wrap">
                      <span className="text-xs bg-bg text-ink-soft px-2 py-1 rounded border border-line">
                        {proposal.proposedFrequency === "WEEKLY"
                          ? "Hàng tuần"
                          : "Hàng tháng"}
                      </span>
                      {proposal.genres && (
                        <>
                          {proposal.genres.split(",").map((genre, idx) => (
                            <span
                              key={idx}
                              className="text-xs bg-bg text-ink-soft px-2 py-1 rounded border border-line"
                            >
                              {genre}
                            </span>
                          ))}
                        </>
                      )}
                    </div>
                    <div className="mt-3">
                      {proposal.sampleManuscriptUrl ? (
                        <Button
                          type="button"
                          variant="soft"
                          onClick={() => window.open(proposal.sampleManuscriptUrl!, "_blank", "noopener,noreferrer")}
                          className="inline-flex items-center gap-2"
                        >
                          <FileText size={16} />
                          Xem bản thảo
                          <ExternalLink size={14} />
                        </Button>
                      ) : (
                        <p className="text-sm text-ink-soft">Không có bản thảo đính kèm</p>
                      )}
                    </div>

                    {proposal.reviewNote && (
                      <Panel className="mt-3 bg-bg p-3 text-sm text-ink-soft">
                        <span className="font-semibold text-ink">Ghi chú xét duyệt:</span>{" "}
                        {proposal.reviewNote}
                      </Panel>
                    )}

                    {isTantou && proposal.status === "UNDER_REVIEW" && (
                      <div className="mt-3 space-y-2">
                        <label className="block">
                          <span className="mb-1 block text-sm font-semibold text-ink">
                            Thêm ghi chú xét duyệt
                          </span>
                          <textarea
                            rows={3}
                            value={reviewNotes[proposal.id] ?? proposal.reviewNote ?? ""}
                            onChange={(e) =>
                              setReviewNotes((prev) => ({ ...prev, [proposal.id]: e.target.value }))
                            }
                            className="w-full rounded-[calc(var(--app-radius)*0.6)] border border-line bg-surface px-3 py-2 text-ink outline-none transition focus:border-accent"
                          />
                        </label>
                        <Button
                          variant="soft"
                          onClick={() => saveReviewNote(proposal.id)}
                          disabled={processingId === proposal.id}
                        >
                          Lưu ghi chú
                        </Button>
                      </div>
                    )}
                  </div>
                  {proposal.status === "SUBMITTED" && (
                    <div className="ml-4 flex-shrink-0">
                      <Button
                        variant="soft"
                        onClick={() => startReview(proposal.id)}
                        disabled={processingId === proposal.id}
                      >
                        {processingId === proposal.id ? "..." : "Bắt đầu xét duyệt"}
                      </Button>
                    </div>
                  )}
                  {isBoard && proposal.status === "UNDER_REVIEW" && (
                    <div className="flex w-72 flex-shrink-0 flex-col gap-2 ml-4">
                      <textarea
                        rows={3}
                        placeholder="Lý do từ chối (bắt buộc nếu từ chối)"
                        value={rejectNotes[proposal.id] ?? ""}
                        onChange={(e) =>
                          setRejectNotes((prev) => ({ ...prev, [proposal.id]: e.target.value }))
                        }
                        className="w-full rounded-[calc(var(--app-radius)*0.6)] border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:border-accent"
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="accent"
                          onClick={() => handleDecision(proposal.id, "APPROVED")}
                          disabled={processingId === proposal.id}
                        >
                          {processingId === proposal.id ? "..." : "Phê duyệt"}
                        </Button>
                        <Button
                          variant="soft"
                          onClick={() => handleDecision(proposal.id, "REJECTED")}
                          disabled={processingId === proposal.id}
                        >
                          {processingId === proposal.id ? "..." : "Từ chối"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Panel>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

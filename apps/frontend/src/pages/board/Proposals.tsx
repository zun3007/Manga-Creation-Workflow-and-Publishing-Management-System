import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "../../lib/api";
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
}

export default function BoardProposals() {
  const toast = useToast();
  const [proposals, setProposals] = useState<ReviewProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);

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

  useEffect(() => {
    loadProposals();
  }, []);

  async function handleDecision(proposalId: number, decision: "APPROVED" | "REJECTED") {
    try {
      setProcessingId(proposalId);
      await api.patch(`/proposals/${proposalId}/decision`, { decision });
      setProposals(proposals.filter((p) => p.id !== proposalId));
      if (decision === "APPROVED") {
        toast.success('Đã duyệt đề xuất — series đã được tạo.');
      } else {
        toast.success('Đã từ chối đề xuất.');
      }
    } catch (err) {
      console.error(`Failed to ${decision.toLowerCase()} proposal:`, err);
      setError(apiErrorMessage(err, "Lỗi khi xử lý đề xuất"));
    } finally {
      setProcessingId(null);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-ink">Duyệt Đề xuất</h1>
        <Panel className="mt-4 p-6 text-ink-soft">Đang tải...</Panel>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-ink">Duyệt Đề xuất</h1>

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
                  </div>
                  <div className="flex gap-2 ml-4 flex-shrink-0">
                    <Button
                      variant="accent"
                      onClick={() => handleDecision(proposal.id, "APPROVED")}
                      disabled={processingId === proposal.id}
                    >
                      {processingId === proposal.id ? "..." : "Duyệt"}
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
              </Panel>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

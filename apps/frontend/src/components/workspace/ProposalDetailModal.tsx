import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "../../lib/api";
import type { Proposal } from "../../types";
import { Modal } from "../ui/Modal";
import { Stamp } from "../ui/Stamp";
import { Spinner } from "../ui/Spinner";

const FREQ_LABEL: Record<string, string> = {
  WEEKLY: "Hàng tuần",
  MONTHLY: "Hàng tháng",
};

const labelClass =
  "font-mono text-[0.6rem] uppercase tracking-wider text-ink-soft";

/** Read-only proposal detail, fetched by id (role-scoped on the backend). */
export function ProposalDetailModal({
  proposalId,
  onClose,
}: {
  proposalId: number;
  onClose: () => void;
}) {
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get<Proposal>(`/proposals/${proposalId}`);
        if (alive) setProposal(res.data);
      } catch (e) {
        if (alive) setError(apiErrorMessage(e, "Không tải được đề xuất"));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [proposalId]);

  return (
    <Modal open onClose={onClose} title="Chi tiết đề xuất" className="w-full max-w-md">
      <div className="space-y-4 p-5">
        {loading ? (
          <div className="grid place-items-center py-8 text-ink-soft">
            <Spinner size={24} className="text-accent" />
          </div>
        ) : error ? (
          <p className="rounded-[calc(var(--app-radius)*0.6)] border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : proposal ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-lg leading-tight text-ink">{proposal.title}</h3>
              <Stamp status={proposal.status || "DRAFT"} />
            </div>

            <div>
              <span className={labelClass}>Tần suất</span>
              <p className="mt-0.5 text-sm text-ink">
                {FREQ_LABEL[proposal.proposedFrequency ?? ""] ?? proposal.proposedFrequency ?? "—"}
              </p>
            </div>

            <div>
              <span className={labelClass}>Tóm tắt</span>
              <p className="mt-0.5 whitespace-pre-wrap text-sm text-ink">
                {proposal.synopsis || "—"}
              </p>
            </div>

            {proposal.genres && (
              <div>
                <span className={labelClass}>Thể loại</span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {proposal.genres.split(",").filter(Boolean).map((g) => (
                    <span
                      key={g}
                      className="rounded-full border border-line bg-bg px-2 py-0.5 text-xs text-ink-soft"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <span className={labelClass}>Bản thảo mẫu</span>
              {proposal.sampleManuscriptUrl ? (
                <a
                  href={proposal.sampleManuscriptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 block text-sm font-semibold text-accent hover:underline"
                >
                  → Xem bản thảo
                </a>
              ) : (
                <p className="mt-0.5 text-sm text-ink-soft">Chưa có</p>
              )}
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  );
}

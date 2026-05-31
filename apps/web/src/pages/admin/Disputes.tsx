import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { Panel } from "../../components/ui/Panel";
import { Button } from "../../components/ui/Button";
import { Stamp } from "../../components/ui/Stamp";
import { EmptyState } from "../../components/ui/EmptyState";

interface Dispute {
  id: number;
  taskId: number;
  reason: string;
  expectedAmount: number | null;
  status: "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "REJECTED";
  resolutionNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
  currentAmount: number;
  task: string | null;
  assistant: string;
}

interface ResolveForm {
  disputeId: number;
  resolutionNote: string;
  adjustedAmount: string;
}

export default function Disputes() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ResolveForm>({
    disputeId: 0,
    resolutionNote: "",
    adjustedAmount: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get<Dispute[]>("/disputes");
      setDisputes(res.data || []);
    } catch (e) {
      console.error("Failed to load disputes", e);
      setError("Không thể tải danh sách khiếu nại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReview(id: number) {
    setSavingId(id);
    setActionError("");
    try {
      await api.patch(`/disputes/${id}/review`);
      setDisputes((prev) =>
        prev.map((d) => (d.id === id ? { ...d, status: "UNDER_REVIEW" } : d))
      );
    } catch (e: any) {
      const message =
        e?.response?.data?.message || "Không thể bắt đầu xem xét khiếu nại.";
      setActionError(message);
      console.error("Failed to review dispute", e);
    } finally {
      setSavingId(null);
    }
  }

  async function handleResolve() {
    const dispute = disputes.find((d) => d.id === editingId);
    if (!dispute) return;

    if (!window.confirm("Giải quyết khiếu nại? Có thể điều chỉnh tiền công.")) {
      return;
    }

    setSavingId(editingId);
    setActionError("");
    try {
      await api.patch(`/disputes/${editingId}/resolve`, {
        status: "RESOLVED",
        resolutionNote: form.resolutionNote,
        adjustedAmount: form.adjustedAmount
          ? Number(form.adjustedAmount)
          : undefined,
      });
      setDisputes((prev) =>
        prev.map((d) =>
          d.id === editingId
            ? {
                ...d,
                status: "RESOLVED",
                resolutionNote: form.resolutionNote,
                resolvedAt: new Date().toISOString(),
              }
            : d
        )
      );
      setEditingId(null);
      setForm({ disputeId: 0, resolutionNote: "", adjustedAmount: "" });
    } catch (e: any) {
      const message =
        e?.response?.data?.message || "Không thể giải quyết khiếu nại.";
      setActionError(message);
      console.error("Failed to resolve dispute", e);
    } finally {
      setSavingId(null);
    }
  }

  async function handleReject() {
    const dispute = disputes.find((d) => d.id === editingId);
    if (!dispute) return;

    if (!window.confirm("Từ chối khiếu nại này?")) {
      return;
    }

    if (!form.resolutionNote.trim()) {
      setActionError("Vui lòng nhập lý do từ chối.");
      return;
    }

    setSavingId(editingId);
    setActionError("");
    try {
      await api.patch(`/disputes/${editingId}/resolve`, {
        status: "REJECTED",
        resolutionNote: form.resolutionNote,
      });
      setDisputes((prev) =>
        prev.map((d) =>
          d.id === editingId
            ? {
                ...d,
                status: "REJECTED",
                resolutionNote: form.resolutionNote,
                resolvedAt: new Date().toISOString(),
              }
            : d
        )
      );
      setEditingId(null);
      setForm({ disputeId: 0, resolutionNote: "", adjustedAmount: "" });
    } catch (e: any) {
      const message =
        e?.response?.data?.message || "Không thể từ chối khiếu nại.";
      setActionError(message);
      console.error("Failed to reject dispute", e);
    } finally {
      setSavingId(null);
    }
  }

  function openEditForm(dispute: Dispute) {
    setEditingId(dispute.id);
    setForm({
      disputeId: dispute.id,
      resolutionNote: "",
      adjustedAmount: "",
    });
  }

  function closeEditForm() {
    setEditingId(null);
    setForm({ disputeId: 0, resolutionNote: "", adjustedAmount: "" });
  }

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-3xl text-ink mb-6">Khiếu nại thu nhập</h1>
        <Panel className="p-6 text-ink-soft">Đang tải…</Panel>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-3xl text-ink mb-6">Khiếu nại thu nhập</h1>
        <Panel className="p-4 bg-danger/10 border-danger/20 text-danger">
          {error}
        </Panel>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl text-ink mb-6">Khiếu nại thu nhập</h1>

      {/* Action Error */}
      {actionError && (
        <Panel className="mb-6 p-4 bg-danger/10 border-danger/20 text-danger">
          {actionError}
        </Panel>
      )}

      {/* Disputes Table */}
      {disputes.length === 0 ? (
        <EmptyState title="Không có khiếu nại nào." />
      ) : (
        <Panel className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-bg">
                <th className="p-4 text-left font-semibold text-ink">Trợ lý</th>
                <th className="p-4 text-left font-semibold text-ink">Việc</th>
                <th className="p-4 text-left font-semibold text-ink">
                  Đề xuất vs Hiện tại
                </th>
                <th className="p-4 text-left font-semibold text-ink">Lý do</th>
                <th className="p-4 text-left font-semibold text-ink">Trạng thái</th>
                <th className="p-4 text-left font-semibold text-ink">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {disputes.map((dispute) => {
                const isEditing = editingId === dispute.id;
                const isSaving = savingId === dispute.id;
                const isResolved =
                  dispute.status === "RESOLVED" ||
                  dispute.status === "REJECTED";
                const isActionable =
                  dispute.status === "OPEN" || dispute.status === "UNDER_REVIEW";

                return (
                  <tr key={dispute.id} className="border-b border-line hover:bg-bg">
                    <td className="p-4 text-ink">{dispute.assistant}</td>
                    <td className="p-4 text-ink">{dispute.task || "—"}</td>
                    <td className="p-4 text-ink">
                      {dispute.expectedAmount
                        ? `${dispute.expectedAmount.toLocaleString("vi-VN")} ₫`
                        : "—"}{" "}
                      vs{" "}
                      {dispute.currentAmount.toLocaleString("vi-VN")} ₫
                    </td>
                    <td className="p-4 text-ink-soft max-w-xs truncate">
                      {dispute.reason}
                    </td>
                    <td className="p-4">
                      <Stamp status={dispute.status} />
                    </td>
                    <td className="p-4">
                      {isResolved ? (
                        <div className="text-xs text-ink-soft max-w-xs">
                          {dispute.resolutionNote}
                        </div>
                      ) : isEditing ? (
                        <div className="flex flex-col gap-2 min-w-max">
                          <textarea
                            placeholder="Ghi chú giải quyết..."
                            value={form.resolutionNote}
                            onChange={(e) =>
                              setForm({ ...form, resolutionNote: e.target.value })
                            }
                            className="px-2 py-1 text-xs rounded border border-line bg-surface text-ink"
                            rows={2}
                          />
                          <input
                            type="number"
                            placeholder="Số tiền điều chỉnh (tuỳ chọn)"
                            value={form.adjustedAmount}
                            onChange={(e) =>
                              setForm({ ...form, adjustedAmount: e.target.value })
                            }
                            className="px-2 py-1 text-xs rounded border border-line bg-surface text-ink"
                          />
                          <div className="flex gap-1">
                            <Button
                              variant="accent"
                              onClick={handleResolve}
                              disabled={isSaving}
                              className="text-xs px-2 py-1 flex-1"
                            >
                              Xác nhận giải quyết
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={handleReject}
                              disabled={isSaving}
                              className="text-xs px-2 py-1 flex-1"
                            >
                              Từ chối
                            </Button>
                            <Button
                              variant="soft"
                              onClick={closeEditForm}
                              disabled={isSaving}
                              className="text-xs px-2 py-1"
                            >
                              Huỷ
                            </Button>
                          </div>
                        </div>
                      ) : isActionable ? (
                        <div className="flex gap-1 flex-wrap">
                          {dispute.status === "OPEN" && (
                            <Button
                              variant="soft"
                              onClick={() => handleReview(dispute.id)}
                              disabled={isSaving}
                              className="text-xs px-2 py-1"
                            >
                              Bắt đầu xem xét
                            </Button>
                          )}
                          <Button
                            variant="accent"
                            onClick={() => openEditForm(dispute)}
                            disabled={isSaving}
                            className="text-xs px-2 py-1"
                          >
                            Giải quyết
                          </Button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      )}
    </div>
  );
}

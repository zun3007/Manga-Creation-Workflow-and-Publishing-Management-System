import { useState, useEffect } from "react";
import React from "react";
import { api } from "../../lib/api";
import { Panel } from "../../components/ui/Panel";
import { Button } from "../../components/ui/Button";
import { Stamp } from "../../components/ui/Stamp";
import { EmptyState } from "../../components/ui/EmptyState";

interface EarningTask {
  id: number;
  description: string | null;
  amount: number;
  series: string;
  chapter: string;
  page: number;
  regionType: string;
  earnedAt: string | null;
  hasDispute: 0 | 1;
}

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
}

interface EarningsData {
  total: number;
  tasks: EarningTask[];
}

export default function Earnings() {
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ reason: "", expectedAmount: "" });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [earningsRes, disputesRes] = await Promise.all([
        api.get<EarningsData>("/earnings/mine"),
        api.get<Dispute[]>("/disputes/mine"),
      ]);
      setEarnings(earningsRes.data || { total: 0, tasks: [] });
      setDisputes(disputesRes.data || []);
    } catch (e) {
      console.error("Failed to load earnings data", e);
      setError("Không thể tải dữ liệu thu nhập. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitDispute(taskId: number) {
    if (!formData.reason.trim()) {
      setError("Vui lòng nhập lý do khiếu nại.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      await api.post("/disputes", {
        taskId,
        reason: formData.reason,
        expectedAmount: formData.expectedAmount
          ? Number(formData.expectedAmount)
          : undefined,
      });

      // Update local state
      if (earnings) {
        setEarnings((prev) =>
          prev
            ? {
                ...prev,
                tasks: prev.tasks.map((t) =>
                  t.id === taskId ? { ...t, hasDispute: 1 } : t
                ),
              }
            : prev
        );
      }

      // Refetch disputes
      const disputesRes = await api.get<Dispute[]>("/disputes/mine");
      setDisputes(disputesRes.data || []);

      // Close form
      setEditingTaskId(null);
      setFormData({ reason: "", expectedAmount: "" });
    } catch (e) {
      console.error("Failed to submit dispute", e);
      setError("Không thể gửi khiếu nại. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-3xl text-ink mb-6">Thu nhập</h1>
        <Panel className="p-6 text-ink-soft">Đang tải…</Panel>
      </div>
    );
  }

  if (error && !earnings) {
    return (
      <div className="p-8">
        <h1 className="text-3xl text-ink mb-6">Thu nhập</h1>
        <Panel className="p-4 bg-danger/10 border-danger/20 text-danger">
          {error}
        </Panel>
      </div>
    );
  }

  const total = earnings?.total ?? 0;
  const tasks = earnings?.tasks ?? [];

  return (
    <div className="p-8">
      <h1 className="text-3xl text-ink mb-6">Thu nhập</h1>

      {error && (
        <Panel className="mb-6 p-4 bg-danger/10 border-danger/20 text-danger">
          {error}
        </Panel>
      )}

      {/* Total Card */}
      <Panel className="mb-6 p-6">
        <p className="text-sm text-ink-soft mb-2">Tổng thu nhập</p>
        <p className="text-3xl font-semibold text-accent">
          {total.toLocaleString("vi-VN")} ₫
        </p>
      </Panel>

      {/* Ledger */}
      {tasks.length === 0 ? (
        <Panel className="mb-6 p-6">
          <EmptyState
            title="Chưa có thu nhập nào."
            hint="Hoàn thành việc được duyệt để tích luỹ thu nhập."
          />
        </Panel>
      ) : (
        <Panel className="mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-bg">
                  <th className="p-4 text-left font-semibold text-ink">Việc</th>
                  <th className="p-4 text-left font-semibold text-ink">
                    Series · Chương · Trang
                  </th>
                  <th className="p-4 text-left font-semibold text-ink">
                    Loại vùng
                  </th>
                  <th className="p-4 text-left font-semibold text-ink">
                    Số tiền
                  </th>
                  <th className="p-4 text-left font-semibold text-ink">Ngày</th>
                  <th className="p-4 text-left font-semibold text-ink">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <React.Fragment key={task.id}>
                    <tr className="border-b border-line hover:bg-bg">
                      <td className="p-4 text-ink">
                        {task.description || "—"}
                      </td>
                      <td className="p-4 text-ink-soft">
                        {[task.series, task.chapter, task.page ? `Trang ${task.page}` : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </td>
                      <td className="p-4 text-ink-soft">{task.regionType}</td>
                      <td className="p-4 font-semibold text-accent">
                        {task.amount.toLocaleString("vi-VN")} ₫
                      </td>
                      <td className="p-4 text-ink-soft">
                        {task.earnedAt
                          ? new Date(task.earnedAt).toLocaleDateString("vi-VN")
                          : "—"}
                      </td>
                      <td className="p-4">
                        {task.hasDispute === 0 ? (
                          <Button
                            variant="soft"
                            onClick={() => setEditingTaskId(task.id)}
                            disabled={busy || editingTaskId !== null}
                            className="text-xs"
                          >
                            Khiếu nại
                          </Button>
                        ) : (
                          <span className="text-xs text-ink-soft">
                            Đã khiếu nại
                          </span>
                        )}
                      </td>
                    </tr>
                    {editingTaskId === task.id && (
                      <tr className="border-b border-line bg-bg">
                        <td colSpan={6} className="p-4">
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-semibold text-ink mb-1">
                                Lý do khiếu nại
                              </label>
                              <textarea
                                value={formData.reason}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    reason: e.target.value,
                                  })
                                }
                                placeholder="Nhập lý do khiếu nại..."
                                className="w-full p-2 border border-line rounded text-sm text-ink bg-surface resize-none"
                                rows={3}
                                disabled={busy}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-ink mb-1">
                                Số tiền đề xuất (tùy chọn)
                              </label>
                              <input
                                type="number"
                                value={formData.expectedAmount}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    expectedAmount: e.target.value,
                                  })
                                }
                                placeholder="0"
                                className="w-full p-2 border border-line rounded text-sm text-ink bg-surface"
                                disabled={busy}
                              />
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="ghost"
                                onClick={() => {
                                  setEditingTaskId(null);
                                  setFormData({ reason: "", expectedAmount: "" });
                                }}
                                disabled={busy}
                                className="text-xs"
                              >
                                Huỷ
                              </Button>
                              <Button
                                variant="accent"
                                onClick={() => handleSubmitDispute(task.id)}
                                disabled={busy}
                                className="text-xs"
                              >
                                Gửi khiếu nại
                              </Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* Disputes */}
      <Panel className="p-6">
        <h2 className="text-lg font-semibold text-ink mb-4">Khiếu nại của tôi</h2>
        {disputes.length === 0 ? (
          <p className="text-sm text-ink-soft">Chưa có khiếu nại nào.</p>
        ) : (
          <div className="space-y-3">
            {disputes.map((dispute) => (
              <div
                key={dispute.id}
                className="p-4 border border-line rounded bg-bg"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1">
                    <p className="font-semibold text-ink">{dispute.task || "—"}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Stamp status={dispute.status} />
                    </div>
                  </div>
                </div>
                <p className="text-sm text-ink-soft mb-2">{dispute.reason}</p>
                <p className="text-sm text-ink-soft">
                  Đề xuất:{" "}
                  {dispute.expectedAmount
                    ? `${dispute.expectedAmount.toLocaleString("vi-VN")} ₫`
                    : "—"}{" "}
                  · Hiện tại: {dispute.currentAmount.toLocaleString("vi-VN")} ₫
                </p>
                {dispute.resolutionNote && (
                  <p className="text-sm text-ink-soft mt-2">
                    Ghi chú: {dispute.resolutionNote}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

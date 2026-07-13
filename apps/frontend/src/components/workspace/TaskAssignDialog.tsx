import { useEffect, useState } from "react";
import { CalendarDays, Coins, UserRound } from "lucide-react";
import { api, apiErrorMessage } from "../../lib/api";
import type { RegionItem } from "../../types";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";

interface Assistant {
  id: number;
  name: string;
  avatar: string | null;
}

interface PriceRule {
  regionType: string;
  basePrice: string | number;
}

interface TaskAssignDialogProps {
  region: RegionItem;
  onClose: () => void;
  onAssigned?: () => void;
}

export function TaskAssignDialog({ region, onClose, onAssigned }: TaskAssignDialogProps) {
  const toast = useToast();
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [selectedAssistantId, setSelectedAssistantId] = useState("");
  const [description, setDescription] = useState("");
  const [instruction, setInstruction] = useState("");
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [payment, setPayment] = useState<number | null>(null);
  const [estimatedPayment, setEstimatedPayment] = useState<number | null>(null);

  useEffect(() => {
    loadAssistants();
    loadEstimatedPayment();
    // Reset payment state when dialog opens
    setPayment(null);
  }, []);

  async function loadAssistants() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get<Assistant[]>("/users/assistants");
      setAssistants(res.data || []);
      if (res.data && res.data.length > 0) {
        setSelectedAssistantId(String(res.data[0].id));
      } else {
        setSelectedAssistantId("");
      }
    } catch (e) {
      console.error("Failed to load assistants", e);
      const msg = apiErrorMessage(e, "Không thể tải danh sách người trợ giúp.");
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function loadEstimatedPayment() {
    try {
      const res = await api.get<PriceRule[]>("/tasks/price-rules");
      const rule = (res.data || []).find((item) => item.regionType === region.type);
      const value = Number(rule?.basePrice ?? 0);
      setEstimatedPayment(Number.isFinite(value) ? value : 0);
    } catch (e) {
      console.error("Failed to load estimated task payment", e);
      setEstimatedPayment(null);
    }
  }

  async function handleAssignTask(e: React.FormEvent) {
    e.preventDefault();
    if (assistants.length === 0) {
      const msg = "Không có Assistant đang hoạt động để giao việc.";
      setError(msg);
      toast.error(msg);
      return;
    }
    if (!selectedAssistantId) {
      const msg = "Vui lòng chọn người phụ trách.";
      setError(msg);
      toast.error(msg);
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {
        regionId: region.id,
        assigneeUserId: parseInt(selectedAssistantId),
      };
      if (description.trim()) payload.description = description.trim();
      if (instruction.trim()) payload.instruction = instruction.trim();
      if (deadline) payload.deadline = new Date(deadline).toISOString();

      const res = await api.post<{ payment?: number | string; payment_amount?: number | string }>("/tasks", payload);
      const assignedPayment = Number(res.data.payment ?? res.data.payment_amount ?? 0);
      setPayment(Number.isFinite(assignedPayment) ? assignedPayment : 0);
      toast.success("Đã giao việc cho Assistant.");

      // Show confirmation for a moment
      setTimeout(() => {
        onAssigned?.();
        onClose();
      }, 1500);
    } catch (e) {
      console.error("Failed to assign task", e);
      const msg = apiErrorMessage(e, "Không thể giao việc. Vui lòng thử lại.");
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const fieldClass =
    "w-full rounded-xl border border-[#4a3430] bg-[#211817] px-4 py-3 text-sm text-[#fff8f1] outline-none transition placeholder:text-[#9d8178] focus:border-accent focus:ring-2 focus:ring-accent/25 disabled:opacity-50";
  const labelClass = "mb-2 block text-sm font-semibold text-[#ead7d0]";
  const selectedAssistant = assistants.find((a) => String(a.id) === selectedAssistantId);
  const money = (value: number | null) =>
    value === null ? "Chưa có giá" : `${value.toLocaleString("vi-VN")} ₫`;

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={`Giao việc - ${region.type}`}
      className="w-full max-w-md !border-[#3a2725] !bg-[#161110] p-7 text-[#fff8f1] shadow-2xl shadow-black/45"
    >
      {payment !== null ? (
        <div className="text-center py-6">
          <p className="text-[#c6aaa1] text-sm mb-2">Việc đã được giao!</p>
          <p className="text-2xl font-bold text-accent">{payment.toLocaleString("vi-VN")} ₫</p>
        </div>
      ) : (
        <form onSubmit={handleAssignTask} className="space-y-5" noValidate>
          {loading ? (
            <span className="font-mono text-xs uppercase tracking-wider animate-pulse text-[#c6aaa1]">
              Đang tải…
            </span>
          ) : (
            <>
              <div className="space-y-2">
                <p className="font-mono text-[0.65rem] uppercase tracking-[0.28em] text-accent/80">
                  Assign Task
                </p>
                <h2 className="font-[var(--font-display)] text-3xl text-[#fff8f1]">
                  Giao việc - {region.type}
                </h2>
              </div>

              <div className="rounded-2xl border border-accent/25 bg-accent/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-semibold text-[#ead7d0]">
                    <Coins size={17} className="text-accent" aria-hidden="true" />
                    Tiền task dự kiến
                  </span>
                  <strong className="text-xl text-accent">{money(estimatedPayment)}</strong>
                </div>
              </div>

              <label className="block">
                <span className={labelClass}>Người trợ giúp</span>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center overflow-hidden rounded-full border border-[#4a3430] bg-[#2a1d1b] text-accent">
                    {selectedAssistant?.avatar ? (
                      <img
                        src={selectedAssistant.avatar}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UserRound size={15} aria-hidden="true" />
                    )}
                  </span>
                  <select
                    value={selectedAssistantId}
                    onChange={(e) => setSelectedAssistantId(e.target.value)}
                    disabled={submitting || assistants.length === 0}
                    className={`${fieldClass} pl-12 [color-scheme:dark]`}
                  >
                    {assistants.length === 0 ? (
                      <option value="">Không có người trợ giúp đang hoạt động</option>
                    ) : (
                      assistants.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </label>

              <label className="block">
                <span className={labelClass}>Mô tả</span>
                <input
                  placeholder="e.g. Tô màu vùng này"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={submitting}
                  className={fieldClass}
                />
              </label>

              <label className="block">
                <span className={labelClass}>Hướng dẫn chi tiết</span>
                <textarea
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  disabled={submitting}
                  rows={3}
                  placeholder="e.g. Dùng màu sắc nhân vật theo style sheet…"
                  className={`${fieldClass} resize-none leading-6`}
                />
              </label>

              <label className="block">
                <span className={labelClass}>Hạn chót (không bắt buộc)</span>
                <div className="relative">
                  <CalendarDays
                    size={17}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-accent"
                    aria-hidden="true"
                  />
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    disabled={submitting}
                    className={`${fieldClass} pl-12 [color-scheme:dark]`}
                  />
                </div>
              </label>

              {error && (
                <p className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-[#f0a39b]">
                  {error}
                </p>
              )}

              {assistants.length === 0 && !error && (
                <p className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-[#f0a39b]">
                  Không có Assistant đang hoạt động để giao việc.
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  variant="ghost"
                  type="button"
                  className="flex-1 !bg-transparent !text-[#ead7d0] border border-[#4a3430] hover:!bg-white/10 hover:!text-white"
                  onClick={onClose}
                  disabled={submitting}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  className="flex-1 !bg-accent text-white shadow-lg shadow-accent/20 hover:brightness-110"
                  loading={submitting}
                  disabled={submitting}
                >
                  Giao việc
                </Button>
              </div>
            </>
          )}
        </form>
      )}
    </Modal>
  );
}

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Coins,
  FileText,
  Trash2,
  UserRound,
} from "lucide-react";
import { api, apiErrorMessage } from "../../lib/api";
import type { RegionItem } from "../../types";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { Stamp } from "../ui/Stamp";

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
  onDeleted?: () => void;
}

function localToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function TaskAssignDialog({
  region,
  onClose,
  onAssigned,
  onDeleted,
}: TaskAssignDialogProps) {
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
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setPayment(null);

    if (region.taskId) {
      setLoading(false);
      return;
    }

    loadAssistants();
    loadEstimatedPayment();
  }, [region.id, region.taskId]);

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
    if (deadline && deadline < localToday()) {
      const msg = "Hạn chót không được là ngày trong quá khứ.";
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

  async function handleDeleteRegion() {
    setDeleting(true);
    setError("");

    try {
      await api.delete(`/regions/${region.id}`);
      toast.success("Đã hủy region chưa phân công.");
      onDeleted?.();
      onClose();
    } catch (e) {
      console.error("Failed to delete region", e);
      setError(apiErrorMessage(e, "Không thể hủy region."));
    } finally {
      setDeleting(false);
    }
  }

  const fieldClass =
    "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-soft/60 hover:border-ink-soft/40 focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-50";
  const labelClass = "mb-1.5 block text-sm font-semibold text-ink";
  const selectedAssistant = assistants.find((a) => String(a.id) === selectedAssistantId);
  const money = (value: number | null) =>
    value === null ? "Chưa có giá" : `${value.toLocaleString("vi-VN")} ₫`;

  if (region.taskId) {
    return (
      <Modal
        open={true}
        onClose={onClose}
        title={`Chi tiết region - ${region.type}`}
        className="w-full max-w-md !border-line !bg-surface p-7 text-ink shadow-2xl shadow-black/15"
      >
        <div className="space-y-5">
          <div>
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.28em] text-accent/80">
              Region đã phân công
            </p>
            <h2 className="mt-2 font-[var(--font-display)] text-3xl text-ink">
              {region.type}
            </h2>
          </div>

          <div className="rounded-2xl border border-accent/25 bg-accent/10 p-4">
            <p className="mb-2 text-xs uppercase tracking-wider text-ink-soft">
              Assistant phụ trách
            </p>
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-accent/15 text-accent">
                <UserRound size={20} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink">
                  {region.assigneeName ?? "Không xác định"}
                </p>
                <p className="mt-1 text-xs text-ink-soft">
                  Task #{region.taskId}
                </p>
              </div>
              {region.taskStatus && <Stamp status={region.taskStatus} />}
            </div>
          </div>

          <p className="text-sm text-ink-soft">
            Region đã có task nên không thể giao lại hoặc hủy.
          </p>

          <Button
            type="button"
            className="w-full !bg-accent text-white"
            onClick={onClose}
          >
            Đóng
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={`Giao việc - ${region.type}`}
      className="w-[min(94vw,34rem)] !max-h-[min(90vh,48rem)] !overflow-hidden !rounded-3xl !border-line !bg-surface p-0 text-ink shadow-2xl shadow-black/20"
    >
      {payment !== null ? (
        <div className="p-8 text-center">
          <p className="text-ink-soft text-sm mb-2">Việc đã được giao!</p>
          <p className="text-2xl font-bold text-accent">{payment.toLocaleString("vi-VN")} ₫</p>
        </div>
      ) : (
        <form
          onSubmit={handleAssignTask}
          className="flex max-h-[min(90vh,48rem)] flex-col"
          noValidate
        >
          {loading ? (
            <div className="grid min-h-64 place-items-center p-8">
              <span className="animate-pulse font-mono text-xs uppercase tracking-wider text-ink-soft">
                Đang tải…
              </span>
            </div>
          ) : (
            <>
              <header className="border-b border-line px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-[0.62rem] uppercase tracking-[0.24em] text-accent">
                      Phân công vùng
                    </p>
                    <h2 className="mt-1 font-[var(--font-display)] text-2xl leading-tight text-ink">
                      Giao việc cho Assistant
                    </h2>
                  </div>
                  <span className="shrink-0 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 font-mono text-[0.65rem] uppercase tracking-wider text-accent">
                    {region.type}
                  </span>
                </div>
              </header>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-accent/20 bg-accent/[0.07] px-4 py-3">
                  <span className="flex items-center gap-2 text-sm font-medium text-ink-soft">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-accent/10 text-accent">
                      <Coins size={16} aria-hidden="true" />
                    </span>
                    Chi phí dự kiến
                  </span>
                  <strong className="text-lg text-accent">{money(estimatedPayment)}</strong>
                </div>

                <label className="block">
                  <span className={labelClass}>Người trợ giúp</span>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center overflow-hidden rounded-full border border-line bg-bg text-accent">
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
                      className={`${fieldClass} pl-12 [color-scheme:light]`}
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

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className={labelClass}>Mô tả ngắn</span>
                    <div className="relative">
                      <FileText
                        size={16}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft"
                        aria-hidden="true"
                      />
                      <input
                        placeholder="Ví dụ: Tô màu vùng"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={submitting}
                        className={`${fieldClass} pl-10`}
                      />
                    </div>
                  </label>

                  <label htmlFor="task-deadline" className="block">
                    <span className={labelClass}>Hạn chót</span>
                    <div className="relative">
                      <CalendarDays
                        size={16}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-accent"
                        aria-hidden="true"
                      />
                      <input
                        id="task-deadline"
                        type="date"
                        min={localToday()}
                        value={deadline}
                        onChange={(e) => {
                          setDeadline(e.target.value);
                          setError("");
                        }}
                        disabled={submitting}
                        aria-describedby="task-deadline-help"
                        className={`${fieldClass} pl-10 [color-scheme:light]`}
                      />
                    </div>
                    <span id="task-deadline-help" className="mt-1 block text-[0.7rem] text-ink-soft">
                      Không bắt buộc · từ hôm nay
                    </span>
                  </label>
                </div>

                <label className="block">
                  <span className={labelClass}>Hướng dẫn chi tiết</span>
                  <textarea
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    disabled={submitting}
                    rows={3}
                    placeholder="Màu sắc, style sheet hoặc lưu ý cần thiết…"
                    className={`${fieldClass} resize-none leading-5`}
                  />
                </label>

                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-xl border border-danger/25 bg-danger/[0.07] px-3.5 py-3 text-sm text-danger"
                  >
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {assistants.length === 0 && !error && (
                  <div className="flex items-start gap-2 rounded-xl border border-danger/25 bg-danger/[0.07] px-3.5 py-3 text-sm text-danger">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <span>Không có Assistant đang hoạt động để giao việc.</span>
                  </div>
                )}

                {confirmingDelete ? (
                  <div className="rounded-xl border border-danger/25 bg-danger/[0.06] p-4">
                    <p className="text-sm font-semibold text-ink">
                      Xác nhận hủy region này?
                    </p>
                    <p className="mt-1 text-xs text-ink-soft">
                      Region chưa được giao nên có thể xóa khỏi trang.
                    </p>
                    <div className="mt-3 flex gap-3">
                      <Button
                        type="button"
                        variant="ghost"
                        className="flex-1 !text-ink"
                        disabled={deleting}
                        onClick={() => setConfirmingDelete(false)}
                      >
                        Giữ lại
                      </Button>
                      <Button
                        type="button"
                        className="flex-1 !bg-danger text-white"
                        loading={deleting}
                        onClick={() => void handleDeleteRegion()}
                      >
                        Xác nhận hủy
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setConfirmingDelete(true)}
                    className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-danger transition hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 size={15} />
                    Hủy region chưa phân công
                  </button>
                )}
              </div>

              <footer className="flex gap-3 border-t border-line bg-surface px-6 py-4">
                <Button
                  variant="ghost"
                  type="button"
                  className="flex-1 border border-line !bg-transparent !text-ink hover:!bg-bg"
                  onClick={onClose}
                  disabled={submitting}
                >
                  Đóng
                </Button>
                <Button
                  type="submit"
                  className="flex-1 !bg-accent text-white shadow-lg shadow-accent/20 hover:brightness-110"
                  loading={submitting}
                  disabled={submitting}
                >
                  Giao việc
                </Button>
              </footer>
            </>
          )}
        </form>
      )}
    </Modal>
  );
}

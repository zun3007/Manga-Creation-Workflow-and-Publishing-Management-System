import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, ClipboardList, Sparkles, X } from "lucide-react";
import { api } from "../../lib/api";
import type { RegionItem } from "../../types";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Avatar } from "../ui/Avatar";

interface Assistant {
  id: number;
  name: string;
  avatar: string | null;
}

interface TaskAssignDialogProps {
  region: RegionItem;
  onClose: () => void;
  onAssigned?: () => void;
}

interface AssignResponse {
  payment_amount?: number | string; // DECIMAL column → mysql2 serializes as string
  priceWarning?: string;
}

/** Local calendar date as YYYY-MM-DD (never via toISOString — that shifts the day in +UTC zones). */
function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toDateInputValue(d);
}

/** Friendly Vietnamese rendering of a YYYY-MM-DD value, parsed as a LOCAL date. */
function formatDeadline(value: string): string {
  if (!value) return "";
  const d = new Date(`${value}T00:00:00`);
  return d.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const QUICK_PICKS = [
  { label: "Hôm nay", days: 0 },
  { label: "3 ngày", days: 3 },
  { label: "1 tuần", days: 7 },
  { label: "2 tuần", days: 14 },
] as const;

export function TaskAssignDialog({ region, onClose, onAssigned }: TaskAssignDialogProps) {
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [selectedAssistantId, setSelectedAssistantId] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [instruction, setInstruction] = useState("");
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [payment, setPayment] = useState<number | null>(null);
  const [priceWarning, setPriceWarning] = useState<string | undefined>();

  const reduceMotion = useReducedMotion();
  const today = useMemo(() => toDateInputValue(new Date()), []);

  async function loadAssistants() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get<Assistant[]>("/users/assistants");
      const list = res.data || [];
      setAssistants(list);
      if (list.length > 0) setSelectedAssistantId(list[0].id);
    } catch (e) {
      console.error("Failed to load assistants", e);
      setError("Không thể tải danh sách người trợ giúp.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAssistants();
  }, []);

  async function handleAssignTask(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAssistantId) {
      setError("Vui lòng chọn người trợ giúp.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const payload: {
        regionId: number;
        assigneeUserId: number;
        description?: string;
        instruction?: string;
        deadline?: string;
      } = {
        regionId: region.id,
        assigneeUserId: selectedAssistantId,
      };
      if (description.trim()) payload.description = description.trim();
      if (instruction.trim()) payload.instruction = instruction.trim();
      // Send the raw calendar date (YYYY-MM-DD). NOT new Date().toISOString():
      // that appends a "Z" which MySQL strict mode rejects, breaking the insert.
      if (deadline) payload.deadline = deadline;

      const res = await api.post<AssignResponse>("/tasks", payload);
      // payment_amount is DECIMAL → mysql2 returns it as a string; coerce so
      // toLocaleString groups thousands ("50.000 ₫" not "50000.00 ₫").
      setPayment(Number(res.data?.payment_amount ?? 0));
      setPriceWarning(res.data?.priceWarning);

      setTimeout(() => {
        onAssigned?.();
        onClose();
      }, 1600);
    } catch (e) {
      console.error("Failed to assign task", e);
      setError("Không thể giao việc. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  const labelClass =
    "mb-1.5 block font-mono text-[0.62rem] uppercase tracking-[0.12em] text-ink-soft";
  const fieldClass =
    "w-full rounded-[calc(var(--app-radius)*0.6)] border border-line bg-surface px-3 py-2 text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:opacity-50";

  return (
    <Modal
      open={true}
      onClose={onClose}
      labelledBy="assign-task-title"
      className="w-full max-w-md"
    >
      {payment !== null ? (
        <div className="px-6 py-10 text-center">
          <motion.span
            initial={reduceMotion ? false : { scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 18 }}
            className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-ok/15 text-ok"
          >
            <Check size={28} strokeWidth={2.5} />
          </motion.span>
          <p className="font-display text-lg text-ink">Đã giao việc!</p>
          <p className="mt-1 text-sm text-ink-soft">Tiền công cho vùng này</p>
          <p className="mt-2 text-3xl font-bold text-accent">
            {payment.toLocaleString("vi-VN")} ₫
          </p>
          {priceWarning && (
            <p className="mx-auto mt-3 max-w-xs text-xs text-warn">{priceWarning}</p>
          )}
        </div>
      ) : (
        <form onSubmit={handleAssignTask}>
          {/* Header */}
          <div className="flex items-start gap-3 border-b border-line px-6 pb-4 pt-5">
            <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-[calc(var(--app-radius)*0.6)] bg-accent/10 text-accent">
              <ClipboardList size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="assign-task-title" className="font-display text-lg leading-tight text-ink">
                Giao việc
              </h2>
              <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-line bg-bg px-2 py-0.5 font-mono text-[0.62rem] uppercase tracking-wider text-ink-soft">
                <Sparkles size={11} className="text-accent-2" />
                Vùng · {region.type}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              aria-label="Đóng"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-soft transition hover:bg-bg hover:text-ink disabled:opacity-50"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-5 px-6 py-5">
            {/* Assistant picker */}
            <div>
              <span className={labelClass}>Người trợ giúp</span>
              {loading ? (
                <div className="space-y-2" aria-hidden>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-[3.25rem] animate-pulse rounded-[calc(var(--app-radius)*0.6)] bg-line/50"
                    />
                  ))}
                </div>
              ) : assistants.length === 0 ? (
                <div className="rounded-[calc(var(--app-radius)*0.6)] border border-dashed border-line bg-bg px-3 py-6 text-center text-sm text-ink-soft">
                  Chưa có người trợ giúp nào để giao việc.
                </div>
              ) : (
                <div
                  role="radiogroup"
                  aria-label="Người trợ giúp"
                  className="max-h-44 space-y-2 overflow-y-auto pr-0.5"
                >
                  {assistants.map((a) => {
                    const selected = selectedAssistantId === a.id;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={submitting}
                        onClick={() => setSelectedAssistantId(a.id)}
                        className={`flex w-full items-center gap-3 rounded-[calc(var(--app-radius)*0.6)] border px-3 py-2.5 text-left transition disabled:opacity-50 ${
                          selected
                            ? "border-accent bg-accent/10 ring-1 ring-accent/30"
                            : "border-line bg-surface hover:border-accent/40 hover:bg-bg"
                        }`}
                      >
                        <Avatar url={a.avatar} name={a.name} />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                          {a.name}
                        </span>
                        <span
                          className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border transition ${
                            selected
                              ? "border-accent bg-accent text-white"
                              : "border-line text-transparent"
                          }`}
                        >
                          <Check size={13} strokeWidth={3} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Description */}
            <label className="block">
              <span className={labelClass}>Mô tả</span>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={submitting}
                placeholder="vd. Tô màu vùng này"
                className={fieldClass}
              />
            </label>

            {/* Instruction */}
            <label className="block">
              <span className={labelClass}>Hướng dẫn chi tiết</span>
              <textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                disabled={submitting}
                rows={3}
                placeholder="vd. Dùng màu nhân vật theo style sheet…"
                className={`${fieldClass} resize-none`}
              />
            </label>

            {/* Deadline */}
            <div>
              <span className={labelClass}>Hạn chót (không bắt buộc)</span>
              <input
                type="date"
                value={deadline}
                min={today}
                onChange={(e) => setDeadline(e.target.value)}
                disabled={submitting}
                className={fieldClass}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {QUICK_PICKS.map((q) => {
                  const value = addDays(q.days);
                  const active = deadline === value;
                  return (
                    <button
                      key={q.label}
                      type="button"
                      disabled={submitting}
                      onClick={() => setDeadline(active ? "" : value)}
                      className={`rounded-full border px-2.5 py-1 text-xs transition disabled:opacity-50 ${
                        active
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-line bg-surface text-ink-soft hover:border-accent/40 hover:text-ink"
                      }`}
                    >
                      {q.label}
                    </button>
                  );
                })}
                {deadline && (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setDeadline("")}
                    className="rounded-full px-2.5 py-1 text-xs text-ink-soft transition hover:text-danger disabled:opacity-50"
                  >
                    ✕ Xóa
                  </button>
                )}
              </div>
              {deadline && (
                <p className="mt-2 text-xs text-ink-soft">
                  Hạn: <span className="text-ink">{formatDeadline(deadline)}</span>
                </p>
              )}
            </div>

            {error && (
              <p className="rounded-[calc(var(--app-radius)*0.6)] border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-2 border-t border-line px-6 py-4">
            <Button
              variant="soft"
              type="button"
              className="flex-1"
              onClick={onClose}
              disabled={submitting}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              className="flex-1"
              loading={submitting}
              disabled={loading || assistants.length === 0 || !selectedAssistantId}
            >
              Giao việc
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

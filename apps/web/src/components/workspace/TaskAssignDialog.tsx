import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { RegionItem } from "../../types";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

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

export function TaskAssignDialog({ region, onClose, onAssigned }: TaskAssignDialogProps) {
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [selectedAssistantId, setSelectedAssistantId] = useState("");
  const [description, setDescription] = useState("");
  const [instruction, setInstruction] = useState("");
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [payment, setPayment] = useState<number | null>(null);

  useEffect(() => {
    loadAssistants();
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
      }
    } catch (e) {
      console.error("Failed to load assistants", e);
      setError("Không thể tải danh sách người trợ giúp.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAssignTask(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAssistantId) {
      setError("Vui lòng chọn người trợ giúp.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const payload: any = {
        regionId: region.id,
        assigneeUserId: parseInt(selectedAssistantId),
      };
      if (description.trim()) payload.description = description.trim();
      if (instruction.trim()) payload.instruction = instruction.trim();
      if (deadline) payload.deadline = new Date(deadline).toISOString();

      const res = await api.post("/tasks", payload);
      setPayment(res.data.payment);

      // Show confirmation for a moment
      setTimeout(() => {
        onAssigned?.();
        onClose();
      }, 1500);
    } catch (e) {
      console.error("Failed to assign task", e);
      setError("Không thể giao việc. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={true} onClose={onClose} title={`Giao việc - ${region.type}`} className="w-full max-w-md">
      {payment !== null ? (
        <div className="text-center py-6">
          <p className="text-ink-soft text-sm mb-2">Việc đã được giao!</p>
          <p className="text-2xl font-bold text-accent">{payment.toLocaleString("vi-VN")} ₫</p>
        </div>
      ) : (
        <form onSubmit={handleAssignTask} className="space-y-4">
          {loading ? (
            <span className="font-mono text-xs uppercase tracking-wider animate-pulse text-ink-soft">
              Đang tải…
            </span>
          ) : (
            <>
              <label className="block">
                <span className="mb-1 block font-mono text-[0.62rem] uppercase tracking-wider text-ink-soft">
                  Người trợ giúp
                </span>
                <select
                  value={selectedAssistantId}
                  onChange={(e) => setSelectedAssistantId(e.target.value)}
                  disabled={submitting || assistants.length === 0}
                  className="w-full rounded-[calc(var(--app-radius)*0.6)] border border-line bg-surface px-3 py-2 text-ink outline-none transition focus:border-accent disabled:opacity-50"
                >
                  {assistants.length === 0 ? (
                    <option>Không có người trợ giúp</option>
                  ) : (
                    assistants.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))
                  )}
                </select>
              </label>

              <Input
                label="Mô tả"
                placeholder="e.g. Tô màu vùng này"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={submitting}
              />

              <label className="block">
                <span className="mb-1 block font-mono text-[0.62rem] uppercase tracking-wider text-ink-soft">
                  Hướng dẫn chi tiết
                </span>
                <textarea
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  disabled={submitting}
                  rows={3}
                  placeholder="e.g. Dùng màu sắc nhân vật theo style sheet…"
                  className="w-full rounded-[calc(var(--app-radius)*0.6)] border border-line bg-surface px-3 py-2 text-ink outline-none transition focus:border-accent disabled:opacity-50"
                />
              </label>

              <label className="block">
                <span className="mb-1 block font-mono text-[0.62rem] uppercase tracking-wider text-ink-soft">
                  Hạn chót (không bắt buộc)
                </span>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  disabled={submitting}
                  className="w-full rounded-[calc(var(--app-radius)*0.6)] border border-line bg-surface px-3 py-2 text-ink outline-none transition focus:border-accent disabled:opacity-50"
                />
              </label>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="flex gap-2 pt-2">
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
                  disabled={assistants.length === 0}
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

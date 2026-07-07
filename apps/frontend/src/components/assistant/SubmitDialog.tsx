import { useState } from "react";
import { api } from "../../lib/api";
import type { TaskItem } from "../../types";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";

interface SubmitDialogProps {
  task: TaskItem;
  onClose: () => void;
  onSubmitted: () => void;
}

export function SubmitDialog({ task, onClose, onSubmitted }: SubmitDialogProps) {
  const toast = useToast();
  const [versionNote, setVersionNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await api.post("/submissions", {
        taskId: task.id,
        versionNote: versionNote || undefined,
      });

      toast.success("Đã nộp bài.");
      onSubmitted();
      onClose();
    } catch (e) {
      console.error("Failed to submit", e);
      const message =
        (e as any)?.response?.data?.message ||
        "Không thể nộp bài. Hãy lưu bài trong Studio trước rồi thử lại.";
      setError(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Nộp bài — ${task.description || `Việc #${task.id}`}`}
      className="w-full max-w-md"
    >
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-[calc(var(--app-radius)*0.75)] border border-accent/30 bg-accent/5 p-4 text-sm leading-relaxed text-ink-soft">
            Không upload file tại đây. Assistant phải mở Studio, sửa trực tiếp
            trên trang được giao và bấm{" "}
            <span className="font-semibold text-ink">Lưu</span>. Nút nộp bài
            sẽ dùng bản Studio mới nhất bạn đã lưu.
          </div>

          <label className="block">
            <span className="mb-1 block font-mono text-[0.62rem] uppercase tracking-wider text-ink-soft">
              Ghi chú phiên bản (không bắt buộc)
            </span>
            <textarea
              value={versionNote}
              onChange={(e) => setVersionNote(e.target.value)}
              disabled={submitting}
              rows={3}
              placeholder="e.g. Đã sửa trực tiếp trong Studio…"
              className="w-full rounded-[calc(var(--app-radius)*0.6)] border border-line bg-surface px-3 py-2 text-ink outline-none transition focus:border-accent disabled:opacity-50"
            />
          </label>

          {error && <p className="text-sm text-danger">{error}</p>}

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
            <Button type="submit" className="flex-1" loading={submitting}>
              Nộp bản Studio
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

import { useRef, useState } from "react";
import { api } from "../../lib/api";
import type { TaskItem } from "../../types";
import { Panel } from "../ui/Panel";
import { Button } from "../ui/Button";

interface SubmitDialogProps {
  task: TaskItem;
  onClose: () => void;
  onSubmitted: () => void;
}

export function SubmitDialog({ task, onClose, onSubmitted }: SubmitDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [versionNote, setVersionNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!file) {
      setError("Vui lòng chọn file để nộp.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // Upload file
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await api.post<{ url: string }>("/uploads", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Submit the submission
      await api.post("/submissions", {
        taskId: task.id,
        fileUrl: uploadRes.data.url,
        versionNote: versionNote || undefined,
      });

      onSubmitted();
      onClose();
    } catch (e) {
      console.error("Failed to submit", e);
      setError("Không thể nộp bài. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md"
        onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
      >
        <Panel className="p-6">
          <h2 className="text-xl font-semibold text-ink mb-4">
            Nộp bài — {task.description || `Việc #${task.id}`}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* File input */}
            <label className="block">
              <span className="mb-2 block font-mono text-[0.62rem] uppercase tracking-wider text-ink-soft">
                Chọn file
              </span>
              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setFile(f);
                  }}
                  disabled={submitting}
                  className="sr-only"
                  accept="image/*,.pdf,.psd"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={submitting}
                  className="w-full rounded-[calc(var(--app-radius)*0.6)] border-2 border-dashed border-line bg-bg p-4 text-center text-ink-soft transition hover:border-accent hover:bg-surface disabled:opacity-50"
                >
                  {file ? (
                    <span className="text-ink">{file.name}</span>
                  ) : (
                    <span>Bấm để chọn hoặc kéo file vào</span>
                  )}
                </button>
              </div>
            </label>

            {/* Version note */}
            <label className="block">
              <span className="mb-1 block font-mono text-[0.62rem] uppercase tracking-wider text-ink-soft">
                Ghi chú phiên bản (không bắt buộc)
              </span>
              <textarea
                value={versionNote}
                onChange={(e) => setVersionNote(e.target.value)}
                disabled={submitting}
                rows={3}
                placeholder="e.g. Đã sửa theo phản hồi, hoàn thành 100%…"
                className="w-full rounded-[calc(var(--app-radius)*0.6)] border border-line bg-surface px-3 py-2 text-ink outline-none transition focus:border-accent disabled:opacity-50"
              />
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}

            {/* Buttons */}
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
                disabled={submitting || !file}
              >
                {submitting ? "Đang nộp…" : "Nộp"}
              </Button>
            </div>
          </form>
        </Panel>
      </div>
    </div>
  );
}

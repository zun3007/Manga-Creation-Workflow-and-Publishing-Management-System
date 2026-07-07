import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TaskStatus } from "@manga/shared";
import { api } from "../../lib/api";
import { useToast } from "../../components/ui/Toast";
import type { TaskItem } from "../../types";
import { Panel } from "../../components/ui/Panel";
import { Button } from "../../components/ui/Button";
import { Stamp } from "../../components/ui/Stamp";
import { SubmitDialog } from "../../components/assistant/SubmitDialog";

export default function Tasks() {
  const navigate = useNavigate();
  const toast = useToast();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get<TaskItem[]>("/tasks/mine");
      setTasks(res.data || []);
    } catch (e) {
      console.error("Failed to load tasks", e);
      setError("Không thể tải danh sách việc. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStartTask(task: TaskItem) {
    setSubmitting(true);
    setError("");
    try {
      await api.patch(`/tasks/${task.id}/start`);
      // Update the task status in the local state
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, status: TaskStatus.IN_PROGRESS } : t
        )
      );
      toast.success('Đã nhận việc.');
    } catch (e) {
      console.error("Failed to start task", e);
      setError("Không thể bắt đầu việc. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitTask(task: TaskItem) {
    setSelectedTask(task);
  }

  function handleSubmitted() {
    if (selectedTask) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === selectedTask.id ? { ...t, status: TaskStatus.SUBMITTED } : t
        )
      );
    }
    setSelectedTask(null);
  }

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl">Việc của tôi</h1>
        <Panel className="mt-4 p-6 text-ink-soft">Đang tải…</Panel>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl mb-6">Việc của tôi</h1>

      {error && (
        <Panel className="mb-6 p-4 bg-danger/10 border-danger/20 text-danger">
          {error}
        </Panel>
      )}

      {tasks.length === 0 ? (
        <Panel className="p-6 text-ink-soft text-center py-12">
          Hiện chưa có việc gì được giao.
        </Panel>
      ) : (
        <div className="grid gap-4">
          {tasks.map((task) => (
            <Panel key={task.id} className="p-6">
              <div className="grid grid-cols-[1fr_auto] gap-4">
                {/* Left side: image, description, metadata */}
                <div className="flex gap-4">
                  {task.pageImage && (
                    <img
                      src={task.pageImage}
                      alt={`Trang ${task.page}`}
                      className="h-24 w-20 shrink-0 rounded object-cover border border-line"
                    />
                  )}
                  <div className="flex-1">
                    {/* Description */}
                    {task.description && (
                      <p className="text-ink mb-2">{task.description}</p>
                    )}

                    {/* Status */}
                    <div className="mb-3 flex items-center gap-2">
                      <Stamp status={task.status} />
                    </div>

                    {/* Metadata: series · chapter · page, region, payment */}
                    <div className="text-sm text-ink-soft space-y-1">
                      {(task.series || task.chapter || task.page) && (
                        <p>
                          {[task.series, task.chapter, task.page ? `trang ${task.page}` : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                      {task.regionType && <p>Vùng: {task.regionType}</p>}
                      {task.payment && (
                        <p className="font-semibold text-accent">
                          {typeof task.payment === "number"
                            ? task.payment.toLocaleString("vi-VN")
                            : task.payment}{" "}
                          ₫
                        </p>
                      )}
                      {task.deadline && (
                        <p>
                          Hạn chót:{" "}
                          {new Date(task.deadline).toLocaleDateString("vi-VN")}
                        </p>
                      )}
                    </div>

                    {/* Instruction if present */}
                    {task.instruction && (
                      <div className="mt-3 p-3 bg-bg rounded text-sm text-ink-soft border-l-2 border-accent">
                        <p className="font-mono text-[0.65rem] uppercase tracking-wider text-ink-soft mb-1">
                          Hướng dẫn
                        </p>
                        <p>{task.instruction}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right side: action buttons */}
                <div className="flex flex-col justify-start gap-2 min-w-max">
                  {task.status === TaskStatus.ASSIGNED && (
                    <Button
                      variant="accent"
                      onClick={() => handleStartTask(task)}
                      disabled={submitting}
                      className="w-32"
                    >
                      Bắt đầu
                    </Button>
                  )}

                  {(task.status === TaskStatus.IN_PROGRESS ||
                    task.status === TaskStatus.REVISION_REQUIRED) && (
                    <>
                      <Button
                        variant="soft"
                        className="w-32"
                        onClick={() => {
                          if (!task.pageId) {
                            toast.error("Task này chưa gắn trang để mở Studio.");
                            return;
                          }
                          navigate(`/studio/page/${task.pageId}`, { state: { task } });
                        }}
                      >
                        Vẽ trong Studio
                      </Button>
                      <Button
                        variant="accent"
                        onClick={() => handleSubmitTask(task)}
                        className="w-32"
                      >
                        Nộp bài
                      </Button>
                    </>
                  )}

                  {task.status === TaskStatus.SUBMITTED && (
                    <span className="text-sm text-ink-soft text-center py-2">
                      Đang chờ duyệt
                    </span>
                  )}

                  {task.status === TaskStatus.APPROVED && (
                    <Stamp status={TaskStatus.APPROVED} label="Hoàn thành" />
                  )}
                </div>
              </div>
            </Panel>
          ))}
        </div>
      )}

      {selectedTask && (
        <SubmitDialog
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onSubmitted={handleSubmitted}
        />
      )}
    </div>
  );
}

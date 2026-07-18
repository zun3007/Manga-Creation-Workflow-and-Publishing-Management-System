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

const PAGE_SIZE = 5;
type TaskGroup = "unfinished" | "finished";

const FINISHED_STATUSES = new Set<TaskStatus>([
  TaskStatus.SUBMITTED,
  TaskStatus.APPROVED,
]);

export default function Tasks() {
  const navigate = useNavigate();
  const toast = useToast();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeGroup, setActiveGroup] = useState<TaskGroup>("unfinished");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

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

  const unfinishedTasks = tasks.filter(
    (task) => !FINISHED_STATUSES.has(task.status)
  );
  const finishedTasks = tasks.filter((task) =>
    FINISHED_STATUSES.has(task.status)
  );
  const groupedTasks =
    activeGroup === "unfinished" ? unfinishedTasks : finishedTasks;
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase("vi-VN");
  const filteredTasks = normalizedSearch
    ? groupedTasks.filter((task) =>
        [
          task.description,
          task.series,
          task.chapter,
          task.page,
          task.regionType,
          task.instruction,
        ]
          .filter((value) => value !== null && value !== undefined)
          .join(" ")
          .toLocaleLowerCase("vi-VN")
          .includes(normalizedSearch)
      )
    : groupedTasks;
  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const visibleTasks = filteredTasks.slice(pageStart, pageStart + PAGE_SIZE);
  const firstVisibleTask = filteredTasks.length === 0 ? 0 : pageStart + 1;
  const lastVisibleTask = Math.min(pageStart + PAGE_SIZE, filteredTasks.length);

  function selectGroup(group: TaskGroup) {
    setActiveGroup(group);
    setCurrentPage(1);
  }

  function handleSearch(value: string) {
    setSearchQuery(value);
    setCurrentPage(1);
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
    <div className="p-4 sm:p-8">
      <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl">Việc của tôi</h1>
      <p className="mt-2 mb-6 text-sm text-ink-soft">
        Theo dõi và hoàn thành các vùng truyện được Mangaka giao.
      </p>

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
        <Panel className="overflow-hidden">
          <div
            className="flex gap-6 border-b border-line px-4 sm:px-6"
            role="tablist"
            aria-label="Nhóm công việc"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeGroup === "unfinished"}
              aria-controls="assistant-task-list"
              onClick={() => selectGroup("unfinished")}
              className={`border-b-2 py-4 text-sm font-semibold transition-colors ${
                activeGroup === "unfinished"
                  ? "border-accent text-accent"
                  : "border-transparent text-ink-soft hover:text-ink"
              }`}
            >
              Chưa làm
              <span className="ml-2 rounded-full bg-bg px-2 py-1 text-xs">
                {unfinishedTasks.length}
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeGroup === "finished"}
              aria-controls="assistant-task-list"
              onClick={() => selectGroup("finished")}
              className={`border-b-2 py-4 text-sm font-semibold transition-colors ${
                activeGroup === "finished"
                  ? "border-accent text-accent"
                  : "border-transparent text-ink-soft hover:text-ink"
              }`}
            >
              Đã làm
              <span className="ml-2 rounded-full bg-bg px-2 py-1 text-xs">
                {finishedTasks.length}
              </span>
            </button>
          </div>

          <div className="border-b border-line bg-bg/40 p-4 sm:px-6">
            <label htmlFor="task-search" className="sr-only">
              Tìm kiếm công việc
            </label>
            <input
              id="task-search"
              type="search"
              value={searchQuery}
              onChange={(event) => handleSearch(event.target.value)}
              placeholder="Tìm theo tên việc, series, chapter hoặc trang..."
              className="w-full rounded-md border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </div>

          <div
            id="assistant-task-list"
            role="tabpanel"
            className="grid gap-4 p-4 sm:p-6"
          >
          {visibleTasks.length === 0 ? (
            <div className="py-10 text-center text-sm text-ink-soft">
              {normalizedSearch
                ? "Không tìm thấy công việc phù hợp."
                : activeGroup === "unfinished"
                  ? "Không còn công việc chưa làm."
                  : "Chưa có công việc đã làm."}
            </div>
          ) : visibleTasks.map((task) => (
            <Panel key={task.id} className="p-4 sm:p-6">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto]">
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
                <div className="flex flex-wrap justify-start gap-2 lg:min-w-max lg:flex-col">
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
                          if (!task.pageId || !task.regionId) {
                            toast.error("Task này chưa gắn vùng để mở Studio.");
                            return;
                          }
                          navigate(`/studio/region/${task.id}`, { state: { task } });
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

          {filteredTasks.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-line px-4 py-4 text-sm text-ink-soft sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <span>
                Hiển thị {firstVisibleTask}–{lastVisibleTask} trong tổng số{" "}
                {filteredTasks.length} việc
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="soft"
                  onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
                  disabled={safePage === 1}
                >
                  Trước
                </Button>
                <span className="min-w-20 text-center">
                  Trang {safePage}/{totalPages}
                </span>
                <Button
                  variant="soft"
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, safePage + 1))
                  }
                  disabled={safePage === totalPages}
                >
                  Sau
                </Button>
              </div>
            </div>
          )}
        </Panel>
      )}

      {selectedTask && (
        <SubmitDialog
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onSubmitted={handleSubmitted}
        />
      )}
      </div>
    </div>
  );
}

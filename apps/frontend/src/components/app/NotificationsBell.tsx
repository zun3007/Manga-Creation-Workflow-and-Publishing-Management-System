import { useState, useEffect, useRef } from "react";
import { Bell, BellRing, Clock3 } from "lucide-react";
import { api } from "../../lib/api";
import type { AppNotification } from "../../types";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  DEADLINE: "Nhắc hạn",
  TASK_ASSIGNMENT: "Phân công công việc",
  SUBMISSION: "Bài nộp",
  REVISION: "Yêu cầu chỉnh sửa",
  REVIEW: "Kết quả duyệt",
  PROPOSAL_DECISION: "Quyết định đề xuất",
  RISK_ALERT: "Cảnh báo rủi ro",
  DECISION: "Quyết định",
  DISPUTE: "Khiếu nại",
  GENERAL: "Thông báo chung",
};

function notificationTypeLabel(type: string): string {
  return NOTIFICATION_TYPE_LABELS[type] ?? "Thông báo";
}

export function NotificationsBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] =
    useState<AppNotification | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadNotifications();
    // Set up 20-second polling interval
    const pollInterval = setInterval(loadNotifications, 20000);
    // Set up click outside listener
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      clearInterval(pollInterval);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    // Refetch notifications when dropdown opens
    loadNotifications();
    // Handle Escape key to close dropdown
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  async function loadNotifications() {
    try {
      const res = await api.get<AppNotification[]>("/notifications");
      setNotifications(res.data || []);
    } catch (err) {
      console.error("Failed to load notifications", err);
      setNotifications([]);
    }
  }

  async function markAsRead(notification: AppNotification) {
    const previousNotifications = notifications;
    setSelectedNotification(notification);
    setIsOpen(false);
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: 1 } : n))
      );
      await api.patch(`/notifications/${notification.id}/read`);
    } catch (err) {
      console.error("Failed to mark notification as read", err);
      setNotifications(previousNotifications);
    }
  }

  async function markAllAsRead() {
    const previousNotifications = notifications;
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: 1 })));
      await api.patch("/notifications/read-all");
    } catch (err) {
      console.error("Failed to mark all as read", err);
      setNotifications(previousNotifications);
    }
  }

  const unreadCount = notifications.filter((n) => n.isRead === 0).length;

  return (
    <>
      <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={unreadCount > 0 ? `notifications (${unreadCount} chưa đọc)` : "notifications"}
        className="relative p-2 text-ink hover:text-accent transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 h-2 w-2 bg-accent rounded-full" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-surface border border-line rounded text-ink shadow-lg z-50">
          <div className="border-b border-line p-4 flex items-center justify-between">
            <div className="font-semibold text-sm">Thông báo</div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-accent hover:underline"
              >
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-ink-soft text-sm">
                Không có thông báo
              </div>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => markAsRead(notif)}
                  className={`w-full text-left p-4 border-b border-line hover:bg-bg/50 transition-colors flex gap-3 ${
                    notif.isRead === 0 ? "bg-bg/30" : ""
                  }`}
                >
                  <div className="flex-shrink-0 mt-1">
                    {notif.isRead === 0 && (
                      <div className="h-2 w-2 bg-accent rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-ink truncate">
                      {notif.title}
                    </div>
                    <div className="text-xs text-ink-soft mt-1">
                      {notif.content}
                    </div>
                    <div className="text-xs text-ink-soft/50 mt-1">
                      {new Date(notif.createdAt).toLocaleDateString("vi-VN")}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
      </div>

      <Modal
        open={selectedNotification !== null}
        onClose={() => setSelectedNotification(null)}
        title="Chi tiết thông báo"
        className="w-[min(94vw,34rem)] !max-h-[min(90vh,42rem)] !overflow-hidden !rounded-3xl !border-line !bg-surface p-0 text-ink shadow-2xl shadow-black/20"
      >
        {selectedNotification && (
          <div className="flex max-h-[min(90vh,42rem)] flex-col">
            <header className="border-b border-line px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-mono text-[0.65rem] uppercase tracking-[0.28em] text-accent/80">
                    Chi tiết thông báo
                  </p>
                  <h2 className="mt-1 break-words font-[var(--font-display)] text-2xl leading-tight text-ink">
                    {selectedNotification.title}
                  </h2>
                </div>
                <span className="max-w-40 shrink-0 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-center font-mono text-[0.65rem] uppercase leading-4 tracking-wider text-accent">
                  {notificationTypeLabel(selectedNotification.type)}
                </span>
              </div>
            </header>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <div className="rounded-2xl border border-accent/20 bg-accent/[0.07] px-4 py-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
                    <BellRing className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 pt-1">
                    <p className="mb-1 font-mono text-[0.65rem] uppercase tracking-wider text-ink-soft">
                      Nội dung
                    </p>
                    <p className="whitespace-pre-wrap break-words text-sm leading-6 text-ink">
                      {selectedNotification.content || "Thông báo này không có nội dung chi tiết."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 px-1 text-xs text-ink-soft">
                <Clock3 className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
                <span>Nhận lúc</span>
                <time className="font-medium text-ink" dateTime={selectedNotification.createdAt}>
                  {new Date(selectedNotification.createdAt).toLocaleString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </time>
              </div>
            </div>

            <footer className="border-t border-line bg-surface px-6 py-4">
              <Button
                variant="ghost"
                type="button"
                aria-label="Đóng chi tiết thông báo"
                className="w-full border border-line !bg-transparent !text-ink hover:!bg-bg"
                onClick={() => setSelectedNotification(null)}
              >
                Đóng
              </Button>
            </footer>
          </div>
        )}
      </Modal>
    </>
  );
}

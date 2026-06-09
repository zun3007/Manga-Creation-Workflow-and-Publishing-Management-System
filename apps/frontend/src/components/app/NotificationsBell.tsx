import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { api } from "../../lib/api";
import type { AppNotification } from "../../types";

export function NotificationsBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
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

  async function markAsRead(id: number) {
    const previousNotifications = notifications;
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: 1 } : n))
      );
      await api.patch(`/notifications/${id}/read`);
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
                  onClick={() => markAsRead(notif.id)}
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
  );
}

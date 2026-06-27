import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "../layouts/AppLayout";
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type NotificationItem,
} from "../features/notifications/notifications.api";
import "./NotificationsPage.css";

const demoNotifications: NotificationItem[] = [
  {
    id: 1,
    title: "Proposal approved",
    message: "Conan has been approved and converted into an active series.",
    type: "APPROVAL",
    isRead: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    title: "Chapter deadline",
    message: "Chapter 1: Viên đạn đỏ is approaching its production deadline.",
    type: "DEADLINE",
    isRead: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 3,
    title: "Asset uploaded",
    message: "A new studio asset was added to your asset library.",
    type: "ASSET",
    isRead: true,
    createdAt: new Date().toISOString(),
  },
];

function normalizeNotifications(data: NotificationItem[]) {
  return data.map((item, index) => ({
    id: item.id ?? index + 1,
    title: item.title ?? "Notification",
    message: item.message ?? "No message content.",
    type: item.type ?? "GENERAL",
    isRead: item.isRead ?? false,
    createdAt: item.createdAt ?? new Date().toISOString(),
  }));
}

function getNotificationIcon(type?: string) {
  const normalizedType = type?.toUpperCase();

  if (normalizedType?.includes("APPROVAL")) {
    return "✅";
  }

  if (normalizedType?.includes("DEADLINE")) {
    return "⏰";
  }

  if (normalizedType?.includes("TASK")) {
    return "🧩";
  }

  if (normalizedType?.includes("ASSET")) {
    return "📦";
  }

  if (normalizedType?.includes("REJECT")) {
    return "⚠️";
  }

  return "🔔";
}

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<"ALL" | "UNREAD">("ALL");
  const [message, setMessage] = useState("Đang tải notifications...");

  async function loadNotifications() {
    setMessage("Đang tải notifications...");

    try {
      const data = await getNotifications();
      setNotifications(normalizeNotifications(data));
      setMessage("");
    } catch {
      setNotifications(demoNotifications);
      setMessage(
        "Backend /notifications chưa sẵn sàng, đang hiển thị demo notifications.",
      );
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  const unreadCount = useMemo(() => {
    return notifications.filter((item) => !item.isRead).length;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (selectedFilter === "UNREAD") {
      return notifications.filter((item) => !item.isRead);
    }

    return notifications;
  }, [notifications, selectedFilter]);

  async function handleMarkAsRead(notificationId: number) {
    setNotifications((current) =>
      current.map((item) =>
        item.id === notificationId ? { ...item, isRead: true } : item,
      ),
    );

    try {
      await markNotificationAsRead(notificationId);
    } catch {
      // Cho phép UI cập nhật trước nếu backend chưa có endpoint mark read.
    }
  }

  async function handleMarkAllRead() {
    setNotifications((current) =>
      current.map((item) => ({
        ...item,
        isRead: true,
      })),
    );

    try {
      await markAllNotificationsAsRead();
      setMessage("Đã đánh dấu tất cả notification là đã đọc.");
      await loadNotifications();
    } catch {
      setMessage("Không thể cập nhật tất cả notification trên backend.");
    }
  }

  return (
    <AppLayout
      title="Notifications"
      subtitle="Track approvals, deadlines, task updates and studio activity."
    >
      <main className="notifications-page">
        <section className="notification-summary-grid">
          <article className="notification-summary-card highlight">
            <span>Total notifications</span>
            <strong>{notifications.length.toString().padStart(2, "0")}</strong>
            <p>All studio activity updates</p>
          </article>

          <article className="notification-summary-card">
            <span>Unread</span>
            <strong>{unreadCount.toString().padStart(2, "0")}</strong>
            <p>Need your attention</p>
          </article>

          <article className="notification-summary-card">
            <span>Filter</span>
            <strong>{selectedFilter}</strong>
            <p>Current notification view</p>
          </article>
        </section>

        <section className="notification-workspace">
          <section className="notification-list-card">
            <div className="notification-toolbar">
              <div>
                <div className="section-chip">Notification center</div>
                <h2>Studio Updates</h2>
              </div>

              <div className="notification-actions">
                <button
                  type="button"
                  className={selectedFilter === "ALL" ? "is-active" : ""}
                  onClick={() => setSelectedFilter("ALL")}
                >
                  All
                </button>

                <button
                  type="button"
                  className={selectedFilter === "UNREAD" ? "is-active" : ""}
                  onClick={() => setSelectedFilter("UNREAD")}
                >
                  Unread
                </button>

                <button type="button" onClick={handleMarkAllRead}>
                  Mark all read
                </button>
              </div>
            </div>

            {message && <p className="notification-message">{message}</p>}

            <div className="notification-list">
              {filteredNotifications.length === 0 && (
                <p className="empty-text">Không có notification nào.</p>
              )}

              {filteredNotifications.map((notification) => (
                <article
                  key={notification.id}
                  className={
                    notification.isRead
                      ? "notification-item"
                      : "notification-item is-unread"
                  }
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notification.type)}
                  </div>

                  <div className="notification-content">
                    <div className="notification-title-row">
                      <h3>{notification.title}</h3>

                      {!notification.isRead && <span>New</span>}
                    </div>

                    <p>{notification.message}</p>

                    <small>
                      {notification.createdAt
                        ? new Date(notification.createdAt).toLocaleString(
                            "vi-VN",
                          )
                        : "No date"}
                    </small>
                  </div>

                  {!notification.isRead && (
                    <button
                      type="button"
                      onClick={() => handleMarkAsRead(notification.id)}
                    >
                      Mark read
                    </button>
                  )}
                </article>
              ))}
            </div>
          </section>
        </section>
      </main>
    </AppLayout>
  );
}

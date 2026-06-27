import { api } from '../../api/axios';

export type NotificationItem = {
  id: number;
  userId?: number;
  title: string;
  message: string;
  type?: string;
  isRead?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export async function getNotifications() {
  const response = await api.get<NotificationItem[]>(
    '/studio-notifications/my',
  );

  return response.data;
}

export async function markNotificationAsRead(notificationId: number) {
  const response = await api.patch(
    `/studio-notifications/${notificationId}/read`,
  );

  return response.data;
}

export async function markAllNotificationsAsRead() {
  const response = await api.patch('/studio-notifications/read-all');

  return response.data;
}

export async function createDemoNotification() {
  const response = await api.post<NotificationItem>(
    '/studio-notifications/demo',
  );

  return response.data;
}
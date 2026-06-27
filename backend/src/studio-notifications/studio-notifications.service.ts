import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type NotificationRow = {
  notification_id: number;
  user_id: number;
  title: string;
  message: string;
  notification_type: string;
  is_read: number;
  created_at: Date;
  updated_at: Date;
};

@Injectable()
export class StudioNotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findMyNotifications(userId: number) {
    const rows = await this.prisma.$queryRaw<NotificationRow[]>`
      SELECT *
      FROM studio_notifications
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;

    return rows.map((row) => this.mapNotification(row));
  }

  async createNotification(data: {
    userId: number;
    title: string;
    message: string;
    type?: string;
  }) {
    await this.prisma.$executeRaw`
      INSERT INTO studio_notifications (
        user_id,
        title,
        message,
        notification_type,
        is_read,
        created_at,
        updated_at
      )
      VALUES (
        ${data.userId},
        ${data.title},
        ${data.message},
        ${data.type ?? 'GENERAL'},
        0,
        NOW(3),
        NOW(3)
      )
    `;

    const rows = await this.prisma.$queryRaw<NotificationRow[]>`
      SELECT *
      FROM studio_notifications
      WHERE user_id = ${data.userId}
      ORDER BY notification_id DESC
      LIMIT 1
    `;

    return this.mapNotification(rows[0]);
  }

  async markAsRead(userId: number, notificationId: number) {
    const rows = await this.prisma.$queryRaw<NotificationRow[]>`
      SELECT *
      FROM studio_notifications
      WHERE notification_id = ${notificationId}
        AND user_id = ${userId}
      LIMIT 1
    `;

    const notification = rows[0];

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.$executeRaw`
      UPDATE studio_notifications
      SET is_read = 1,
          updated_at = NOW(3)
      WHERE notification_id = ${notificationId}
        AND user_id = ${userId}
    `;

    return {
      message: 'Notification marked as read',
      notificationId,
    };
  }

  async markAllAsRead(userId: number) {
    await this.prisma.$executeRaw`
      UPDATE studio_notifications
      SET is_read = 1,
          updated_at = NOW(3)
      WHERE user_id = ${userId}
    `;

    return {
      message: 'All notifications marked as read',
    };
  }

  private mapNotification(row: NotificationRow) {
    return {
      id: row.notification_id,
      userId: row.user_id,
      title: row.title,
      message: row.message,
      type: row.notification_type,
      isRead: Boolean(row.is_read),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

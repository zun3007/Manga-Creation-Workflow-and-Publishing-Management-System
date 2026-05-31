import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { NotificationType } from '@manga/shared';

@Injectable()
export class NotificationsService {
  constructor(private readonly db: DbService) {}

  async notify(
    recipientUserId: number,
    type: NotificationType,
    title: string,
    content: string,
    relatedEntityType: string,
    relatedEntityId: number,
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO \`Notification\` (recipient_user_id, notification_type, title, content, related_entity_type, related_entity_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [recipientUserId, type, title, content, relatedEntityType, relatedEntityId],
    );
  }

  async listForUser(userId: number) {
    return this.db.query(
      `SELECT notification_id AS id, notification_type AS type, title, content, is_read AS isRead, created_at AS createdAt
       FROM \`Notification\`
       WHERE recipient_user_id = ?
       ORDER BY is_read ASC, created_at DESC
       LIMIT 50`,
      [userId],
    );
  }

  async markRead(id: number, userId: number): Promise<void> {
    await this.db.query(
      `UPDATE \`Notification\` SET is_read = 1, read_at = NOW()
       WHERE notification_id = ? AND recipient_user_id = ?`,
      [id, userId],
    );
  }

  async markAllRead(userId: number): Promise<void> {
    await this.db.query(
      `UPDATE \`Notification\` SET is_read = 1, read_at = NOW() WHERE recipient_user_id = ? AND is_read = 0`,
      [userId],
    );
  }
}

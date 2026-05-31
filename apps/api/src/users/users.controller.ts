import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DbService } from '../db/db.service';

interface AssistantRow {
  id: number;
  name: string;
  avatar: string | null;
}

interface EditorRow {
  id: number;
  name: string;
  avatar: string | null;
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly db: DbService) {}

  @Get('assistants')
  async getAssistants(): Promise<AssistantRow[]> {
    return this.db.query<AssistantRow>(
      `SELECT user_id AS id, full_name AS name, avatar_url AS avatar
       FROM \`User\`
       WHERE role = 'ASSISTANT' AND is_activated = 1
       ORDER BY full_name ASC`,
      [],
    );
  }

  @Get('editors')
  async getEditors(): Promise<EditorRow[]> {
    return this.db.query<EditorRow>(
      `SELECT user_id AS id, full_name AS name, avatar_url AS avatar
       FROM \`User\`
       WHERE role = 'TANTOU_EDITOR' AND is_activated = 1
       ORDER BY full_name ASC`,
      [],
    );
  }
}

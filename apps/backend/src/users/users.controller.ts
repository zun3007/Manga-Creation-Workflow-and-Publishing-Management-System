import { Controller, Get, Patch, Body, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@manga/shared';
import { DbService } from '../db/db.service';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

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
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    private readonly db: DbService,
    private readonly usersService: UsersService,
  ) {}

  // Mangaka needs the assistant roster to assign tasks; Admin manages users.
  // Previously any authenticated role could enumerate all assistants — scope it to
  // these two (the manga-api-test AssistantsApiTest logs in as Admin and expects 200).
  @Get('assistants')
  @Roles(Role.MANGAKA, Role.ADMIN)
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

  @Get('me')
  async getProfile(@Req() req: any) {
    return this.usersService.getProfile(req.user.id);
  }

  @Patch('me')
  async updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(
      req.user.id,
      dto.fullName,
      dto.avatarUrl,
    );
  }
}

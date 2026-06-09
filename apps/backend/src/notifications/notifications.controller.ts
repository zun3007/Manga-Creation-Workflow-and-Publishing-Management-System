import { Controller, Get, Patch, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  list(@Req() req: any) {
    return this.service.listForUser(req.user.id);
  }

  @Patch('read-all')
  readAll(@Req() req: any) {
    return this.service.markAllRead(req.user.id).then(() => ({ ok: true }));
  }

  @Patch(':id/read')
  read(@Param('id') id: string, @Req() req: any) {
    return this.service.markRead(+id, req.user.id).then(() => ({ ok: true }));
  }
}

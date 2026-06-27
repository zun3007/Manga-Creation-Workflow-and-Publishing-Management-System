import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../generated/prisma/client';
import { StudioNotificationsService } from './studio-notifications.service';

@Controller('studio-notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRole.ADMIN,
  UserRole.MANGAKA,
  UserRole.ASSISTANT,
  UserRole.TANTOU_EDITOR,
  UserRole.EDITORIAL_BOARD,
)
export class StudioNotificationsController {
  constructor(
    private readonly studioNotificationsService: StudioNotificationsService,
  ) {}

  @Get('my')
  findMyNotifications(@Req() request: any) {
    return this.studioNotificationsService.findMyNotifications(
      request.user.sub,
    );
  }

  @Patch(':notificationId/read')
  markAsRead(
    @Req() request: any,
    @Param('notificationId', ParseIntPipe) notificationId: number,
  ) {
    return this.studioNotificationsService.markAsRead(
      request.user.sub,
      notificationId,
    );
  }

  @Patch('read-all')
  markAllAsRead(@Req() request: any) {
    return this.studioNotificationsService.markAllAsRead(request.user.sub);
  }

  @Post('demo')
  createDemoNotification(@Req() request: any) {
    return this.studioNotificationsService.createNotification({
      userId: request.user.sub,
      title: 'Welcome to MangaFlow',
      message: 'Notifications are now saved in the database.',
      type: 'GENERAL',
    });
  }
}

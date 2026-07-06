import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Role } from '@manga/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { DashboardService } from './dashboard.service';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  summary(@Req() req: any) {
    return this.dashboard.summary(req.user.id, req.user.role);
  }

  @Get('series')
  @UseGuards(RolesGuard)
  @Roles(Role.MANGAKA)
  series(@Req() req: any) {
    return this.dashboard.series(req.user.id);
  }

  @Get('editor-series')
  @UseGuards(RolesGuard)
  @Roles(Role.TANTOU_EDITOR)
  editorSeries(@Req() req: any) {
    return this.dashboard.editorSeries(req.user.id);
  }

  @Get('tasks')
  @UseGuards(RolesGuard)
  @Roles(Role.MANGAKA)
  tasks(@Req() req: any) {
    return this.dashboard.tasks(req.user.id);
  }

  @Get('submissions')
  @UseGuards(RolesGuard)
  @Roles(Role.MANGAKA)
  submissions(@Req() req: any) {
    return this.dashboard.submissions(req.user.id);
  }

  @Get('notifications')
  notifications(@Req() req: any) {
    return this.dashboard.notifications(req.user.id);
  }
}

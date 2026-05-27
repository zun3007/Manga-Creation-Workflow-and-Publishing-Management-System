import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  summary(@Req() req: any) {
    return this.dashboard.summary(req.user.id);
  }

  @Get('series')
  series(@Req() req: any) {
    return this.dashboard.series(req.user.id);
  }

  @Get('tasks')
  tasks(@Req() req: any) {
    return this.dashboard.tasks(req.user.id);
  }

  @Get('submissions')
  submissions(@Req() req: any) {
    return this.dashboard.submissions(req.user.id);
  }

  @Get('notifications')
  notifications(@Req() req: any) {
    return this.dashboard.notifications(req.user.id);
  }
}

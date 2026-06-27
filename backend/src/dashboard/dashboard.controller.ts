import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { DashboardService } from './dashboard.service';

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  getOverview(@Req() request: RequestWithUser) {
    return this.dashboardService.getOverview(request.user);
  }
}
import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@manga/shared';
import { EarningsService } from './earnings.service';

@Controller('earnings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EarningsController {
  constructor(private readonly service: EarningsService) {}

  @Get('mine')
  @Roles(Role.ASSISTANT)
  async mine(@Req() req: any) {
    return this.service.mine(req.user.id);
  }
}

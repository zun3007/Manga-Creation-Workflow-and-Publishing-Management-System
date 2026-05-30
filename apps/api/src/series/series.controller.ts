import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@manga/shared';
import { SeriesService } from './series.service';

@Controller('series')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SeriesController {
  constructor(private readonly service: SeriesService) {}

  @Get('mine')
  @Roles(Role.MANGAKA)
  async listMine(@Req() req: any) {
    return this.service.listMine(req.user.id);
  }

  @Get(':id')
  @Roles(Role.MANGAKA)
  async getOne(@Param('id') id: string, @Req() req: any) {
    return this.service.getOne(+id, req.user.id);
  }
}

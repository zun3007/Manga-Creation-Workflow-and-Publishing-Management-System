import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@manga/shared';
import { DecisionsService } from './decisions.service';
import { CreateDecisionDto } from './dto/create-decision.dto';

@Controller('decisions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DecisionsController {
  constructor(private readonly service: DecisionsService) {}

  @Post()
  @Roles(Role.EDITORIAL_BOARD)
  async decide(@Body() dto: CreateDecisionDto, @Req() req: any) {
    return this.service.decide(req.user.id, dto);
  }

  @Get()
  @Roles(Role.EDITORIAL_BOARD, Role.ADMIN, Role.MANGAKA)
  async listForSeries(@Query('seriesId') seriesId: string, @Req() req: any) {
    return this.service.listForSeries(+seriesId, req.user);
  }
}

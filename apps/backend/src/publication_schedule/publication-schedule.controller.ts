import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@manga/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreatePublicationScheduleDto } from './dto/create-publication-schedule.dto';
import { PublicationScheduleService } from './publication-schedule.service';

@Controller('publication-schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PublicationScheduleController {
  constructor(private readonly service: PublicationScheduleService) {}

  @Get()
  @Roles(Role.EDITORIAL_BOARD, Role.ADMIN, Role.MANGAKA, Role.TANTOU_EDITOR)
  async list() {
    return this.service.list();
  }

  @Get('eligible-chapters')
  @Roles(Role.EDITORIAL_BOARD, Role.ADMIN)
  async eligibleChapters() {
    return this.service.eligibleChapters();
  }

  @Post()
  @Roles(Role.EDITORIAL_BOARD, Role.ADMIN)
  async create(@Body() dto: CreatePublicationScheduleDto, @Req() req: any) {
    return this.service.create(req.user.id, dto);
  }

  @Patch(':id/cancel')
  @Roles(Role.EDITORIAL_BOARD, Role.ADMIN)
  async cancel(@Param('id') id: string) {
    return this.service.cancel(+id);
  }

  @Patch(':id/publish')
  @Roles(Role.EDITORIAL_BOARD, Role.ADMIN)
  async publish(@Param('id') id: string) {
    return this.service.publish(+id);
  }
}

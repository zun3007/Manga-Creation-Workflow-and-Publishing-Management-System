import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '../generated/prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { SeriesService } from './series.service';

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

@Controller('series')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SeriesController {
  constructor(private readonly seriesService: SeriesService) {}

  // Mangaka xem series của mình
  @Get('mine')
  @Roles(UserRole.MANGAKA)
  findMine(@Req() request: RequestWithUser) {
    return this.seriesService.findMine(request.user.sub);
  }

  // Xem chi tiết series
  @Get(':id')
  @Roles(
    UserRole.MANGAKA,
    UserRole.TANTOU_EDITOR,
    UserRole.EDITORIAL_BOARD,
    UserRole.ADMIN,
  )
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.seriesService.findOne(id);
  }
}
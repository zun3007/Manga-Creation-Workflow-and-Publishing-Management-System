import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '../generated/prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SeriesProposalsService } from './series-proposals.service';

@Controller('board/series-proposals')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.EDITORIAL_BOARD)
export class SeriesProposalsBoardController {
  constructor(
    private readonly seriesProposalsService: SeriesProposalsService,
  ) {}

  @Get('pending')
  findPending() {
    return this.seriesProposalsService.findPendingForBoard();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.seriesProposalsService.findOneForBoard(id);
  }

  @Post(':id/approve')
  approve(@Param('id', ParseIntPipe) id: number) {
    return this.seriesProposalsService.approve(id);
  }

  @Post(':id/reject')
  reject(@Param('id', ParseIntPipe) id: number) {
    return this.seriesProposalsService.reject(id);
  }
}
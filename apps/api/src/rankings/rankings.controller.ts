import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@manga/shared';
import { RankingsService } from './rankings.service';
import { CreateVotePeriodDto } from './dto/create-vote-period.dto';
import { CreateVoteDto } from './dto/create-vote.dto';

// No class-level prefix: routes are /vote-periods, /votes, /rankings (matches the web client + documented contract).
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class RankingsController {
  constructor(private readonly service: RankingsService) {}

  @Post('vote-periods')
  @Roles(Role.EDITORIAL_BOARD, Role.ADMIN)
  async openPeriod(@Body() dto: CreateVotePeriodDto) {
    return this.service.openPeriod(dto);
  }

  @Get('vote-periods/open')
  @Roles(Role.EDITORIAL_BOARD)
  async openPeriods(@Req() req: any) {
    return this.service.openPeriods(req.user.id);
  }

  @Post('votes')
  @Roles(Role.EDITORIAL_BOARD)
  async castVote(@Body() dto: CreateVoteDto, @Req() req: any) {
    return this.service.castVote(req.user.id, dto);
  }

  @Post('vote-periods/:id/close')
  @Roles(Role.EDITORIAL_BOARD, Role.ADMIN)
  async closePeriod(@Param('id') id: string) {
    return this.service.closePeriod(+id);
  }

  @Get('rankings')
  @Roles(Role.EDITORIAL_BOARD, Role.ADMIN, Role.MANGAKA)
  async leaderboard() {
    return this.service.leaderboard();
  }
}

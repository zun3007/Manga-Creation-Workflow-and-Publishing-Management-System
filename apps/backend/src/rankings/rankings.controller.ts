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
import { ImportReaderVotesDto } from './dto/import-reader-votes.dto';
import { DeleteReaderVoteImportDto } from './dto/delete-reader-vote-import.dto';

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
  @Roles(Role.ADMIN)
  async closePeriod(@Param('id') id: string) {
    return this.service.closePeriod(+id);
  }

  @Get('rankings')
  @Roles(Role.EDITORIAL_BOARD, Role.ADMIN, Role.MANGAKA)
  async leaderboard() {
    return this.service.leaderboard();
  }

  @Post('reader-vote-imports/csv')
  @Roles(Role.EDITORIAL_BOARD, Role.ADMIN)
  async importReaderVotesCsv(@Body() dto: ImportReaderVotesDto, @Req() req: any) {
    return this.service.importReaderVotesCsv(dto, req.user.id);
  }

  @Get('reader-vote-imports/history')
  @Roles(Role.EDITORIAL_BOARD, Role.ADMIN)
  async readerVoteImportHistory() {
    return this.service.readerVoteImportHistory();
  }

  @Get('reader-vote-rankings/latest')
  @Roles(Role.EDITORIAL_BOARD, Role.ADMIN, Role.MANGAKA)
  async latestReaderVoteRankings(@Req() req: any) {
    return this.service.latestReaderVoteRankings(req.user.id);
  }

  @Get('reader-vote-imports/delete-requests/pending')
  @Roles(Role.EDITORIAL_BOARD)
  async pendingReaderVoteImportDeleteRequests(@Req() req: any) {
    return this.service.pendingReaderVoteImportDeleteRequests(req.user.id);
  }

  @Post('reader-vote-imports/:id/delete-request')
  @Roles(Role.EDITORIAL_BOARD)
  async requestDeleteReaderVoteImport(
    @Param('id') id: string,
    @Body() dto: DeleteReaderVoteImportDto,
    @Req() req: any,
  ) {
    return this.service.requestDeleteReaderVoteImport(+id, req.user.id, dto);
  }

  @Post('reader-vote-imports/:id/delete-approval')
  @Roles(Role.EDITORIAL_BOARD)
  async approveDeleteReaderVoteImport(@Param('id') id: string, @Req() req: any) {
    return this.service.approveDeleteReaderVoteImport(+id, req.user.id);
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { UserRole } from '../generated/prisma/client';
import { BoardRankingService } from './board-ranking.service';
import { CreateBoardVoteDto } from './dto/create-board-vote.dto';

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

@Controller('board/rankings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.EDITORIAL_BOARD)
export class BoardRankingController {
  constructor(private readonly boardRankingService: BoardRankingService) {}

  @Get()
  findRanking() {
    return this.boardRankingService.findRanking();
  }

  @Post('vote')
  submitVote(@Req() request: RequestWithUser, @Body() dto: CreateBoardVoteDto) {
    return this.boardRankingService.submitVote(request.user.sub, dto);
  }

  @Patch('proposals/:proposalId/approve')
  approveProposal(@Param('proposalId', ParseIntPipe) proposalId: number) {
    return this.boardRankingService.approveProposal(proposalId);
  }

  @Patch('proposals/:proposalId/reject')
  rejectProposal(@Param('proposalId', ParseIntPipe) proposalId: number) {
    return this.boardRankingService.rejectProposal(proposalId);
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '../generated/prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateSeriesProposalDto } from './dto/create-series-proposal.dto';
import { SeriesProposalsService } from './series-proposals.service';

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

@Controller('series-proposals')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MANGAKA)
export class SeriesProposalsController {
  constructor(
    private readonly seriesProposalsService: SeriesProposalsService,
  ) {}

  @Post()
  create(
    @Req() request: RequestWithUser,
    @Body() dto: CreateSeriesProposalDto,
  ) {
    return this.seriesProposalsService.create(request.user.sub, dto);
  }

  @Get('mine')
  findMine(@Req() request: RequestWithUser) {
    return this.seriesProposalsService.findMine(request.user.sub);
  }

  @Get(':id')
  findOne(
    @Req() request: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.seriesProposalsService.findOneForMangaka(
      id,
      request.user.sub,
    );
  }

  @Post(':id/submit')
  submit(
    @Req() request: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.seriesProposalsService.submit(id, request.user.sub);
  }
}
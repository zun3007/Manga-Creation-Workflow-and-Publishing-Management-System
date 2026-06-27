import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@manga/shared';
import { ProposalsService } from './proposals.service';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { UpdateProposalDto } from './dto/update-proposal.dto';
import { DecisionDto } from './dto/decision.dto';

@Controller('proposals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProposalsController {
  constructor(private readonly service: ProposalsService) {}

  @Post()
  @Roles(Role.MANGAKA)
  async create(@Body() dto: CreateProposalDto, @Req() req: any) {
    return this.service.create(req.user.id, dto);
  }

  @Get('mine')
  @Roles(Role.MANGAKA)
  async listMine(@Req() req: any) {
    return this.service.listMine(req.user.id);
  }

  @Patch(':id/submit')
  @Roles(Role.MANGAKA)
  async submit(@Param('id') id: string, @Req() req: any) {
    return this.service.submit(+id, req.user.id);
  }

  @Patch(':id')
  @Roles(Role.MANGAKA)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProposalDto,
    @Req() req: any,
  ) {
    return this.service.update(+id, req.user.id, dto);
  }

  @Get('review-queue')
  @Roles(Role.EDITORIAL_BOARD)
  async reviewQueue() {
    return this.service.reviewQueue();
  }

  @Patch(':id/decision')
  @Roles(Role.EDITORIAL_BOARD)
  async decide(
    @Param('id') id: string,
    @Body() dto: DecisionDto,
    @Req() req: any,
  ) {
    return this.service.decide(+id, dto.decision, req.user.id);
  }

  // Declared LAST so the static routes above ('mine', 'review-queue') match first.
  @Get(':id')
  @Roles(Role.MANGAKA, Role.EDITORIAL_BOARD, Role.TANTOU_EDITOR)
  async getDetail(@Param('id') id: string, @Req() req: any) {
    return this.service.getDetail(+id, req.user.id, req.user.role);
  }
}

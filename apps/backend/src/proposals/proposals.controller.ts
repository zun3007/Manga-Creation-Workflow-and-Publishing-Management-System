import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@manga/shared';
import { ProposalsService } from './proposals.service';
import { CreateProposalDto } from './dto/create-proposal.dto';
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

  @Get('sample-manuscript-config')
  @Roles(Role.MANGAKA)
  async sampleManuscriptConfig() {
    return this.service.sampleManuscriptConfig();
  }

  @Post(':id/sample-manuscript')
  @Roles(Role.MANGAKA)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadSampleManuscript(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return this.service.uploadSampleManuscript(+id, req.user.id, file, baseUrl);
  }

  @Patch(':id/submit')
  @Roles(Role.MANGAKA)
  async submit(@Param('id') id: string, @Req() req: any) {
    return this.service.submit(+id, req.user.id);
  }

  @Get('review-queue')
  @Roles(Role.EDITORIAL_BOARD, Role.TANTOU_EDITOR)
  async reviewQueue() {
    return this.service.reviewQueue();
  }

  @Get(':id/review')
  @Roles(Role.EDITORIAL_BOARD, Role.TANTOU_EDITOR)
  async reviewDetail(@Param('id') id: string) {
    return this.service.reviewDetail(+id);
  }

  @Patch(':id/start-review')
  @Roles(Role.EDITORIAL_BOARD, Role.TANTOU_EDITOR)
  async startReview(@Param('id') id: string) {
    return this.service.startReview(+id);
  }

  @Patch(':id/review-note')
  @Roles(Role.TANTOU_EDITOR)
  async reviewNote(@Param('id') id: string, @Body('note') note: string) {
    return this.service.updateReviewNote(+id, note ?? '');
  }

  @Patch(':id/decision')
  @Roles(Role.EDITORIAL_BOARD)
  async decide(
    @Param('id') id: string,
    @Body() dto: DecisionDto,
    @Req() req: any,
  ) {
    return this.service.decide(+id, dto.decision, req.user.id, dto.note);
  }
}

import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@manga/shared';
import { ChaptersService } from './chapters.service';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { ChapterStatusDto } from './dto/chapter-status.dto';
import { EditorReviewDto } from './dto/editor-review.dto';

@Controller('chapters')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChaptersController {
  constructor(private readonly service: ChaptersService) {}

  @Post()
  @Roles(Role.MANGAKA)
  async create(@Body() dto: CreateChapterDto, @Req() req: any) {
    return this.service.create(req.user.id, dto);
  }

  @Get()
  @Roles(Role.MANGAKA)
  async listBySeries(@Query('seriesId') seriesId: string, @Req() req: any) {
    return this.service.listBySeries(+seriesId, req.user.id);
  }

  @Patch(':id/status')
  @Roles(Role.MANGAKA)
  async setStatus(
    @Param('id') id: string,
    @Body() dto: ChapterStatusDto,
    @Req() req: any,
  ) {
    return this.service.setStatus(+id, req.user.id, dto.status);
  }

  @Get('review-queue')
  @Roles(Role.TANTOU_EDITOR)
  async reviewQueue(@Req() req: any) {
    return this.service.reviewQueue(req.user.id);
  }

  @Get(':id/pages')
  @Roles(Role.TANTOU_EDITOR)
  async editorPages(@Param('id') id: string, @Req() req: any) {
    return this.service.editorPages(+id, req.user.id);
  }

  @Patch(':id/editor-review')
  @Roles(Role.TANTOU_EDITOR)
  async editorReview(
    @Param('id') id: string,
    @Body() dto: EditorReviewDto,
    @Req() req: any,
  ) {
    return this.service.editorReview(+id, req.user.id, dto.decision, dto.feedback);
  }
}

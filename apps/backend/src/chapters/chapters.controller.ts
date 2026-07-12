import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@manga/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ChaptersService } from './chapters.service';
import { BoardReviewDto } from './dto/board-review.dto';
import { ChapterStatusDto } from './dto/chapter-status.dto';
import { CreateChapterDto } from './dto/create-chapter.dto';
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
    return this.service.listBySeries(Number(seriesId), req.user.id);
  }

  @Patch(':id/status')
  @Roles(Role.MANGAKA)
  async setStatus(
    @Param('id') id: string,
    @Body() dto: ChapterStatusDto,
    @Req() req: any,
  ) {
    return this.service.setStatus(Number(id), req.user.id, dto.status);
  }

  /*
   * Hàng chờ của Tantou Editor.
   */
  @Get('review-queue')
  @Roles(Role.TANTOU_EDITOR)
  async reviewQueue(@Req() req: any) {
    return this.service.reviewQueue(req.user.id);
  }

  /*
   * Hàng chờ Hội đồng:
   * chỉ lấy chương đang EDITOR_APPROVED.
   */
  @Get('board-review-queue')
  @Roles(Role.EDITORIAL_BOARD, Role.ADMIN)
  async boardReviewQueue() {
    return this.service.boardReviewQueue();
  }

  @Get(':id/board-review-detail')
  @Roles(Role.EDITORIAL_BOARD, Role.ADMIN)
  async boardReviewDetail(@Param('id') id: string) {
    return this.service.boardReviewDetail(Number(id));
  }

  /*
   * Kiểm tra một chương có:
   * - đang được Hội đồng duyệt hay không
   * - được phép lên lịch xuất bản hay không
   */
  @Get(':id/board-review-status')
  @Roles(Role.EDITORIAL_BOARD, Role.ADMIN)
  async boardReviewStatus(@Param('id') id: string) {
    return this.service.boardReviewStatus(Number(id));
  }

  /*
   * Hội đồng chấp nhận hoặc từ chối chương.
   */
  @Patch(':id/board-review')
  @Roles(Role.EDITORIAL_BOARD, Role.ADMIN)
  async boardReview(
    @Param('id') id: string,
    @Body() dto: BoardReviewDto,
    @Req() req: any,
  ) {
    return this.service.boardReview(
      Number(id),
      req.user.id,
      dto.decision,
      dto.feedback,
    );
  }

  @Get(':id/pages')
  @Roles(Role.TANTOU_EDITOR)
  async editorPages(@Param('id') id: string, @Req() req: any) {
    return this.service.editorPages(Number(id), req.user.id);
  }

  @Patch(':id/editor-review')
  @Roles(Role.TANTOU_EDITOR)
  async editorReview(
    @Param('id') id: string,
    @Body() dto: EditorReviewDto,
    @Req() req: any,
  ) {
    return this.service.editorReview(
      Number(id),
      req.user.id,
      dto.decision,
      dto.feedback,
    );
  }
}

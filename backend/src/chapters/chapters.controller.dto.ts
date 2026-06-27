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
import { UserRole } from '../generated/prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { ChaptersService } from './chapters.service';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

@Controller('chapters')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MANGAKA)
export class ChaptersController {
  constructor(private readonly chaptersService: ChaptersService) {}

  // POST /chapters
  @Post()
  create(
    @Req() request: RequestWithUser,
    @Body() dto: CreateChapterDto,
  ) {
    return this.chaptersService.create(request.user.sub, dto);
  }

  // GET /chapters/series/:seriesId
  @Get('series/:seriesId')
  findBySeries(
    @Req() request: RequestWithUser,
    @Param('seriesId', ParseIntPipe) seriesId: number,
  ) {
    return this.chaptersService.findBySeries(
      seriesId,
      request.user.sub,
    );
  }

  // GET /chapters/:id
  @Get(':id')
  findOne(
    @Req() request: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.chaptersService.findOne(
      id,
      request.user.sub,
    );
  }

  // PATCH /chapters/:id
  @Patch(':id')
  update(
    @Req() request: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateChapterDto,
  ) {
    return this.chaptersService.update(
      id,
      request.user.sub,
      dto,
    );
  }
}
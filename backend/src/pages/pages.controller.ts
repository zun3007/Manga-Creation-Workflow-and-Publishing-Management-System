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
import { CreatePageDto } from './dto/create-page.dto';
import { CreatePageVersionDto } from './dto/create-page-version.dto';
import { PagesService } from './pages.service';

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

@Controller('pages')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MANGAKA)
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  // POST /pages
  @Post()
  create(
    @Req() request: RequestWithUser,
    @Body() dto: CreatePageDto,
  ) {
    return this.pagesService.create(request.user.sub, dto);
  }

  // GET /pages/chapter/:chapterId
  @Get('chapter/:chapterId')
  findByChapter(
    @Req() request: RequestWithUser,
    @Param('chapterId', ParseIntPipe) chapterId: number,
  ) {
    return this.pagesService.findByChapter(
      chapterId,
      request.user.sub,
    );
  }

  // GET /pages/:id
  @Get(':id')
  findOne(
    @Req() request: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.pagesService.findOne(
      id,
      request.user.sub,
    );
  }

  // POST /pages/:id/versions
  @Post(':id/versions')
  addVersion(
    @Req() request: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePageVersionDto,
  ) {
    return this.pagesService.addVersion(
      id,
      request.user.sub,
      dto,
    );
  }
}
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@manga/shared';
import { PagesService } from './pages.service';
import { CreatePageDto } from './dto/create-page.dto';

@Controller('pages')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PagesController {
  constructor(private readonly service: PagesService) {}

  @Post()
  @Roles(Role.MANGAKA)
  async create(@Body() dto: CreatePageDto, @Req() req: any) {
    return this.service.create(req.user.id, dto);
  }

  @Get()
  @Roles(Role.MANGAKA)
  async listByChapter(@Query('chapterId') chapterId: string, @Req() req: any) {
    return this.service.listByChapter(+chapterId, req.user.id);
  }

  @Get(':id')
  @Roles(Role.MANGAKA)
  async getOne(@Param('id') id: string, @Req() req: any) {
    return this.service.findOne(+id, req.user.id);
  }
}

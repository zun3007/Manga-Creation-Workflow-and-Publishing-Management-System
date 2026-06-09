import { Controller, Post, Get, Body, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@manga/shared';
import { StudioService } from './studio.service';
import { SavePageVersionDto } from './dto/save-page-version.dto';
import { SaveDocDto } from './dto/save-doc.dto';

@Controller('studio')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudioController {
  constructor(private readonly service: StudioService) {}

  @Post('page-versions')
  @Roles(Role.MANGAKA)
  savePageVersion(@Body() dto: SavePageVersionDto, @Req() req: any) {
    return this.service.savePageVersion(req.user.id, dto.pageId, dto.imageUrl, dto.note);
  }

  @Post('docs')
  @Roles(Role.MANGAKA)
  saveDoc(@Body() dto: SaveDocDto, @Req() req: any) {
    return this.service.saveDoc(req.user.id, dto.pageId, dto.manifest);
  }

  @Get('docs/:pageId')
  @Roles(Role.MANGAKA)
  getDoc(@Param('pageId') pageId: string, @Req() req: any) {
    return this.service.getDoc(req.user.id, +pageId);
  }
}

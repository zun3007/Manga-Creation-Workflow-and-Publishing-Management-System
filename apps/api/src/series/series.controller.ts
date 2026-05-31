import { Controller, Get, Param, Req, UseGuards, Put, Delete, Body } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@manga/shared';
import { SeriesService } from './series.service';
import { AssignEditorDto } from './dto/assign-editor.dto';

@Controller('series')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SeriesController {
  constructor(private readonly service: SeriesService) {}

  @Get('all')
  @Roles(Role.ADMIN, Role.EDITORIAL_BOARD)
  async listAll() {
    return this.service.listAll();
  }

  @Get('mine')
  @Roles(Role.MANGAKA)
  async listMine(@Req() req: any) {
    return this.service.listMine(req.user.id);
  }

  @Get(':id')
  @Roles(Role.MANGAKA)
  async getOne(@Param('id') id: string, @Req() req: any) {
    return this.service.getOne(+id, req.user.id);
  }

  @Put(':id/editor')
  @Roles(Role.ADMIN, Role.EDITORIAL_BOARD)
  async assignEditor(@Param('id') id: string, @Body() dto: AssignEditorDto) {
    return this.service.assignEditor(+id, dto.editorUserId);
  }

  @Delete(':id/editor')
  @Roles(Role.ADMIN, Role.EDITORIAL_BOARD)
  async unassignEditor(@Param('id') id: string) {
    return this.service.unassignEditor(+id);
  }
}

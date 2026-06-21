import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
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
import { RegionsService } from './regions.service';
import { CreateRegionDto } from './dto/create-region.dto';
import { UpdateRegionDto } from './dto/update-region.dto';

@Controller('regions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RegionsController {
  constructor(private readonly service: RegionsService) {}

  @Post()
  @Roles(Role.MANGAKA)
  async create(@Body() dto: CreateRegionDto, @Req() req: any) {
    return this.service.create(req.user.id, dto);
  }

  @Get()
  @Roles(Role.MANGAKA)
  async listByPage(@Query('pageId') pageId: string, @Req() req: any) {
    return this.service.listByPage(+pageId, req.user.id);
  }

  @Patch(':id')
  @Roles(Role.MANGAKA)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRegionDto,
    @Req() req: any,
  ) {
    return this.service.updateType(+id, req.user.id, dto.regionType);
  }

  @Delete(':id')
  @Roles(Role.MANGAKA)
  async delete(@Param('id') id: string, @Req() req: any) {
    return this.service.delete(+id, req.user.id);
  }
}

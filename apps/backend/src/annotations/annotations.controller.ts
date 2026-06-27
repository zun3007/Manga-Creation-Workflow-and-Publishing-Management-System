import {
  Controller,
  Post,
  Get,
  Patch,
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
import { AnnotationsService } from './annotations.service';
import { CreateAnnotationDto } from './dto/create-annotation.dto';

@Controller('annotations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnnotationsController {
  constructor(private readonly service: AnnotationsService) {}

  @Post()
  @Roles(Role.TANTOU_EDITOR)
  async create(@Body() dto: CreateAnnotationDto, @Req() req: any) {
    await this.service.assertAccess(req.user.id, dto.targetType, dto.targetId);
    return this.service.create(req.user.id, dto);
  }

  @Get()
  @Roles(Role.TANTOU_EDITOR, Role.MANGAKA)
  async list(
    @Query('targetType') targetType: string,
    @Query('targetId') targetId: string,
    @Req() req: any,
  ) {
    await this.service.assertAccess(req.user.id, targetType, +targetId);
    return this.service.list(targetType, +targetId);
  }

  @Patch(':id/resolve')
  @Roles(Role.TANTOU_EDITOR)
  async resolve(@Param('id') id: string) {
    return this.service.resolve(+id);
  }
}

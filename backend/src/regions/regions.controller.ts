import {
  Body,
  Controller,
  Delete,
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
import { CreateRegionDto } from './dto/create-region.dto';
import { UpdateRegionDto } from './dto/update-region.dto';
import { RegionsService } from './regions.service';

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

@Controller('regions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MANGAKA)
export class RegionsController {
  constructor(private readonly regionsService: RegionsService) {}

  // POST /regions
  @Post()
  create(
    @Req() request: RequestWithUser,
    @Body() dto: CreateRegionDto,
  ) {
    return this.regionsService.create(request.user.sub, dto);
  }

  // GET /regions/page/:pageId
  @Get('page/:pageId')
  findByPage(
    @Req() request: RequestWithUser,
    @Param('pageId', ParseIntPipe) pageId: number,
  ) {
    return this.regionsService.findByPage(pageId, request.user.sub);
  }

  // GET /regions/:id
  @Get(':id')
  findOne(
    @Req() request: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.regionsService.findOne(id, request.user.sub);
  }

  // PATCH /regions/:id
  @Patch(':id')
  update(
    @Req() request: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRegionDto,
  ) {
    return this.regionsService.update(id, request.user.sub, dto);
  }

  // DELETE /regions/:id
  @Delete(':id')
  remove(
    @Req() request: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.regionsService.remove(id, request.user.sub);
  }
}
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
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';

@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TasksController {
  constructor(private readonly service: TasksService) {}

  @Post()
  @Roles(Role.MANGAKA)
  async assign(@Body() dto: CreateTaskDto, @Req() req: any) {
    return this.service.assign(req.user.id, dto);
  }

  @Get('mine')
  @Roles(Role.ASSISTANT)
  async listMine(@Req() req: any) {
    return this.service.listMine(req.user.id);
  }

  @Get()
  @Roles(Role.MANGAKA)
  async listByPage(@Query('pageId') pageId: string, @Req() req: any) {
    return this.service.listByPage(+pageId, req.user.id);
  }

  @Patch(':id/start')
  @Roles(Role.ASSISTANT)
  async start(@Param('id') id: string, @Req() req: any) {
    return this.service.start(+id, req.user.id);
  }
}

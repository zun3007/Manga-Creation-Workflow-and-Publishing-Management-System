import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@manga/shared';
import { AdminService } from './admin.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get('users')
  users() {
    return this.service.listUsers();
  }

  @Get('overview')
  overview() {
    return this.service.overview();
  }

  @Post('users')
  create(@Body() dto: CreateUserDto) {
    return this.service.createUser(dto);
  }

  @Patch('users/:id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.service.updateUser(+id, dto);
  }
}

import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@manga/shared';
import { DisputesService } from './disputes.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';

@Controller('disputes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DisputesController {
  constructor(private readonly service: DisputesService) {}

  @Post()
  @Roles(Role.ASSISTANT)
  async file(@Body() dto: CreateDisputeDto, @Req() req: any) {
    return this.service.file(req.user.id, dto);
  }

  @Get('mine')
  @Roles(Role.ASSISTANT)
  async mine(@Req() req: any) {
    return this.service.mine(req.user.id);
  }

  @Get()
  @Roles(Role.ADMIN)
  async listAll() {
    return this.service.listAll();
  }

  @Patch(':id/review')
  @Roles(Role.ADMIN)
  async markUnderReview(@Param('id') id: string, @Req() req: any) {
    return this.service.markUnderReview(+id, req.user.id);
  }

  @Patch(':id/resolve')
  @Roles(Role.ADMIN)
  async resolve(
    @Param('id') id: string,
    @Body() dto: ResolveDisputeDto,
    @Req() req: any,
  ) {
    return this.service.resolve(+id, req.user.id, dto);
  }
}

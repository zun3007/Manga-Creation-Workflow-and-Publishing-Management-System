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
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { ReviewSubmissionDto } from './dto/review-submission.dto';

@Controller('submissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubmissionsController {
  constructor(private readonly service: SubmissionsService) {}

  @Post()
  @Roles(Role.ASSISTANT)
  async submit(@Body() dto: CreateSubmissionDto, @Req() req: any) {
    return this.service.submit(req.user.id, dto);
  }

  @Get('review-queue')
  @Roles(Role.MANGAKA)
  async reviewQueue(@Req() req: any) {
    return this.service.reviewQueue(req.user.id);
  }

  @Patch(':id/review')
  @Roles(Role.MANGAKA)
  async review(
    @Param('id') id: string,
    @Body() dto: ReviewSubmissionDto,
    @Req() req: any,
  ) {
    return this.service.review(+id, req.user.id, dto.decision, dto.feedback);
  }
}

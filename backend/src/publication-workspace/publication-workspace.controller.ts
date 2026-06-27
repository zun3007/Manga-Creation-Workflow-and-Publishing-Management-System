import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { PublicationWorkspaceService } from './publication-workspace.service';

@Controller('publication-workspace')
export class PublicationWorkspaceController {
  constructor(
    private readonly publicationWorkspaceService: PublicationWorkspaceService,
  ) {}

  @Get()
  getDashboard() {
    return this.publicationWorkspaceService.getDashboard();
  }

  @Get('upcoming')
  getUpcomingSchedules() {
    return this.publicationWorkspaceService.getUpcomingSchedules();
  }

  @Get('history')
  getHistory() {
    return this.publicationWorkspaceService.getHistory();
  }

  @Post('schedules')
  createSchedule(
    @Body()
    body: {
      chapterId: number;
      scheduledByUserId: number;
      releaseDate: string;
    },
  ) {
    return this.publicationWorkspaceService.createSchedule({
      chapterId: Number(body.chapterId),
      scheduledByUserId: Number(body.scheduledByUserId),
      releaseDate: body.releaseDate,
    });
  }

  @Patch('schedules/:id/publish')
  publishSchedule(@Param('id', ParseIntPipe) id: number) {
    return this.publicationWorkspaceService.publishSchedule(id);
  }

  @Patch('schedules/:id/cancel')
  cancelSchedule(@Param('id', ParseIntPipe) id: number) {
    return this.publicationWorkspaceService.cancelSchedule(id);
  }
}

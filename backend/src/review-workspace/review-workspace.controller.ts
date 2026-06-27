import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ReviewWorkspaceService } from './review-workspace.service';

@Controller('review-workspace')
export class ReviewWorkspaceController {
  constructor(private readonly reviewWorkspaceService: ReviewWorkspaceService) {}

  @Get()
  getDashboard() {
    return this.reviewWorkspaceService.getDashboard();
  }

  @Get('pending')
  getPendingSubmissions() {
    return this.reviewWorkspaceService.getPendingSubmissions();
  }

  @Get('history')
  getSubmissionHistory() {
    return this.reviewWorkspaceService.getSubmissionHistory();
  }

  @Get('task/:taskId')
  getTaskSubmissions(@Param('taskId', ParseIntPipe) taskId: number) {
    return this.reviewWorkspaceService.getTaskSubmissions(taskId);
  }
}

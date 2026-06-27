import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { TasksService } from '../tasks/tasks.service';

@Controller('submissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubmissionsController {
  constructor(private readonly tasksService: TasksService) {}

  // Assistant xem lịch sử bài nộp của mình
  @Get('my')
  @Roles('ASSISTANT')
  getMySubmissions(@Req() request: any) {
    return this.tasksService.getMySubmissions(request.user.sub);
  }

  // Mangaka xem submissions cần review
  @Get('review')
  @Roles('MANGAKA')
  getReviewSubmissions(@Req() request: any) {
    return this.tasksService.getReviewSubmissions(request.user.sub);
  }

  // Tantou Editor xem toàn bộ submissions để review
  @Get('editor/review')
  @Roles('TANTOU_EDITOR')
  getEditorReviewSubmissions(@Req() request: any) {
    return this.tasksService.getEditorReviewSubmissions(request.user.sub);
  }

  // Assistant nộp bài cho task
  @Post('tasks/:id')
  @Roles('ASSISTANT')
  createSubmission(
    @Param('id', ParseIntPipe) taskId: number,
    @Body() body: CreateSubmissionDto,
    @Req() request: any,
  ) {
    return this.tasksService.createSubmission(taskId, request.user.sub, body);
  }

  // Mangaka hoặc Tantou Editor approve submission
  @Patch(':submissionId/approve')
  @Roles('MANGAKA', 'TANTOU_EDITOR')
  approveSubmission(
    @Param('submissionId', ParseIntPipe) submissionId: number,
    @Req() request: any,
  ) {
    return this.tasksService.approveSubmission(
      submissionId,
      request.user.sub,
      request.user.role,
    );
  }

  // Mangaka hoặc Tantou Editor yêu cầu sửa bài
  @Patch(':submissionId/revision')
  @Roles('MANGAKA', 'TANTOU_EDITOR')
  requestRevision(
    @Param('submissionId', ParseIntPipe) submissionId: number,
    @Body('feedback') feedback: string,
    @Req() request: any,
  ) {
    return this.tasksService.requestSubmissionRevision(
      submissionId,
      request.user.sub,
      request.user.role,
      feedback,
    );
  }
}

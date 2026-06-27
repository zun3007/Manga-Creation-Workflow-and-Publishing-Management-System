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
import { Request } from 'express';
import { UserRole } from '../generated/prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { TasksService } from './tasks.service';

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // =========================
  // MANGAKA TASK MANAGEMENT
  // =========================

  // Mangaka tạo task
  @Post()
  @Roles(UserRole.MANGAKA)
  create(@Req() request: RequestWithUser, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(request.user.sub, dto);
  }

  // Mangaka xem task mình đã giao
  @Get('created-by-me')
  @Roles(UserRole.MANGAKA)
  findCreatedByMe(@Req() request: RequestWithUser) {
    return this.tasksService.findCreatedByMe(request.user.sub);
  }

  // Mangaka lấy danh sách assistant để giao task
  @Get('assistant-options')
  @Roles(UserRole.MANGAKA, UserRole.TANTOU_EDITOR)
  getAssistantOptions() {
    return this.tasksService.getAssistantOptions();
  }

  // Mangaka xem submissions cần review
  @Get('review-submissions')
  @Roles(UserRole.MANGAKA)
  getSubmissionsForReview(@Req() request: RequestWithUser) {
    return this.tasksService.findSubmissionsForReview(request.user.sub);
  }

  // Mangaka hoặc Tantou Editor approve submission
  @Patch('submissions/:submissionId/approve')
  @Roles(UserRole.MANGAKA, UserRole.TANTOU_EDITOR)
  approveSubmission(
    @Param('submissionId', ParseIntPipe) submissionId: number,
    @Req() request: RequestWithUser,
  ) {
    return this.tasksService.approveSubmission(
      submissionId,
      request.user.sub,
      request.user.role,
    );
  }
  // Mangaka hoặc Tantou Editor yêu cầu revision
  @Patch('submissions/:submissionId/revision')
  @Roles(UserRole.MANGAKA, UserRole.TANTOU_EDITOR)
  requestSubmissionRevision(
    @Param('submissionId', ParseIntPipe) submissionId: number,
    @Req() request: RequestWithUser,
    @Body('feedback') feedback?: string,
  ) {
    return this.tasksService.requestSubmissionRevision(
      submissionId,
      request.user.sub,
      request.user.role,
      feedback,
    );
  }

  // =========================
  // ASSISTANT TASK WORKFLOW
  // =========================

  // Assistant xem task được giao
  @Get('assigned-to-me')
  @Roles(UserRole.ASSISTANT)
  findAssignedToMe(@Req() request: RequestWithUser) {
    return this.tasksService.findAssignedToMe(request.user.sub);
  }

  // Assistant xem lịch sử submissions của mình
  @Get('my-submissions')
  @Roles(UserRole.ASSISTANT)
  getMySubmissions(@Req() request: RequestWithUser) {
    return this.tasksService.findMySubmissions(request.user.sub);
  }

  // Assistant xem earnings của mình
  @Get('my-earnings')
  @Roles(UserRole.ASSISTANT)
  getMyEarnings(@Req() request: RequestWithUser) {
    return this.tasksService.getMyEarnings(request.user.sub);
  }

  // Assistant nhận task
  @Patch(':id/accept')
  @Roles(UserRole.ASSISTANT)
  accept(
    @Req() request: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tasksService.accept(id, request.user.sub);
  }

  // Assistant submit kết quả
  @Post(':id/submissions')
  @Roles(UserRole.ASSISTANT)
  submit(
    @Req() request: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateSubmissionDto,
  ) {
    return this.tasksService.submit(id, request.user.sub, dto);
  }

  // =========================
  // TANTOU EDITOR WORKFLOW
  // =========================

  // Tantou Editor xem toàn bộ submissions để review
  @Get('editor/review-submissions')
  @Roles(UserRole.TANTOU_EDITOR)
  getEditorReviewSubmissions() {
    return this.tasksService.findSubmissionsForEditorReview();
  }

  // Tantou Editor xem production overview
  @Get('editor/production-overview')
  @Roles(UserRole.TANTOU_EDITOR)
  getEditorProductionOverview() {
    return this.tasksService.getEditorProductionOverview();
  }

  // =========================
  // SHARED TASK DETAIL
  // Lưu ý: route :id luôn để cuối cùng
  // =========================

  // Xem chi tiết task
  @Get(':id')
  @Roles(UserRole.MANGAKA, UserRole.ASSISTANT, UserRole.TANTOU_EDITOR)
  findOne(
    @Req() request: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tasksService.findOne(id, request.user.sub);
  }
}

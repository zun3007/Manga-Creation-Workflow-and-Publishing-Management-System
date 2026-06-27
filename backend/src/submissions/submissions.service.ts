import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubmissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(body: {
    taskId: number;
    assistantUserId?: number;
    submitterUserId?: number;
    fileUrl: string;
    feedback?: string;
    note?: string;
    versionNumber?: number;
  }) {
    const task = await this.prisma.task.findUnique({
      where: { id: body.taskId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const assistantUserId = body.assistantUserId ?? body.submitterUserId;

    if (!assistantUserId) {
      throw new NotFoundException('Assistant user id is required');
    }

    const latestSubmission = await this.prisma.submission.findFirst({
      where: {
        taskId: body.taskId,
      },
      orderBy: {
        versionNumber: 'desc',
      },
    });

    const nextVersionNumber =
      body.versionNumber ?? (latestSubmission?.versionNumber ?? 0) + 1;

    return this.prisma.submission.create({
      data: {
        taskId: body.taskId,
        pageId: (task as any).pageId,
        assistantUserId,
        versionNumber: nextVersionNumber,
        fileUrl: body.fileUrl,
        feedback: body.feedback ?? body.note ?? null,
        status: 'SUBMITTED',
      } as any,
    });
  }

  async findAll() {
    return this.prisma.submission.findMany({
      orderBy: {
        id: 'desc',
      },
    });
  }

  async findByTask(taskId: number) {
    return this.prisma.submission.findMany({
      where: {
        taskId,
      },
      orderBy: {
        versionNumber: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const submission = await this.prisma.submission.findUnique({
      where: { id },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    return submission;
  }
}

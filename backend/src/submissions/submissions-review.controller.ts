import {
  Body,
  Controller,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('submissions')
export class SubmissionsReviewController {
  constructor(private readonly prisma: PrismaService) {}

  @Patch(':id/review')
  async reviewSubmission(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      status: string;
      feedback?: string;
      reviewedByUserId?: number;
    },
  ) {
    const submission = await this.prisma.submission.findUnique({
      where: { id },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    const updatedSubmission = await this.prisma.submission.update({
      where: { id },
      data: {
        status: body.status as any,
        feedback: body.feedback ?? (submission as any).feedback ?? null,
        reviewedByUserId: body.reviewedByUserId
          ? Number(body.reviewedByUserId)
          : null,
        reviewedAt: new Date(),
      } as any,
    });

    if (body.status === 'APPROVED') {
      await this.prisma.task.update({
        where: { id: (submission as any).taskId },
        data: {
          status: 'APPROVED' as any,
        },
      });
    }

    if (
      body.status === 'REVISION_REQUESTED' ||
      body.status === 'REJECTED'
    ) {
      await this.prisma.task.update({
        where: { id: (submission as any).taskId },
        data: {
          status: 'REVISION_REQUESTED' as any,
        },
      });
    }

    return updatedSubmission;
  }
}

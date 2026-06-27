import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReviewWorkspaceService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const pendingSubmissions = await this.prisma.submission.findMany({
      where: {
        status: 'SUBMITTED' as any,
      },
      orderBy: {
        submittedAt: 'desc',
      },
      include: {
        task: true,
        page: true,
      },
    });

    const approvedSubmissions = await this.prisma.submission.findMany({
      where: {
        status: 'APPROVED' as any,
      },
      orderBy: {
        reviewedAt: 'desc',
      },
      take: 10,
      include: {
        task: true,
        page: true,
      },
    });

    const revisionSubmissions = await this.prisma.submission.findMany({
      where: {
        status: 'REVISION_REQUESTED' as any,
      },
      orderBy: {
        reviewedAt: 'desc',
      },
      take: 10,
      include: {
        task: true,
        page: true,
      },
    });

    const pendingCount = await this.prisma.submission.count({
      where: {
        status: 'SUBMITTED' as any,
      },
    });

    const approvedCount = await this.prisma.submission.count({
      where: {
        status: 'APPROVED' as any,
      },
    });

    const revisionCount = await this.prisma.submission.count({
      where: {
        status: 'REVISION_REQUESTED' as any,
      },
    });

    return {
      summary: {
        pendingCount,
        approvedCount,
        revisionCount,
        totalReviewedCount: approvedCount + revisionCount,
      },
      sections: {
        pendingSubmissions,
        approvedSubmissions,
        revisionSubmissions,
      },
    };
  }

  async getPendingSubmissions() {
    return this.prisma.submission.findMany({
      where: {
        status: 'SUBMITTED' as any,
      },
      orderBy: {
        submittedAt: 'desc',
      },
      include: {
        task: true,
        page: true,
      },
    });
  }

  async getSubmissionHistory() {
    return this.prisma.submission.findMany({
      where: {
        status: {
          in: ['APPROVED', 'REVISION_REQUESTED'] as any,
        },
      },
      orderBy: {
        reviewedAt: 'desc',
      },
      include: {
        task: true,
        page: true,
      },
    });
  }

  async getTaskSubmissions(taskId: number) {
    return this.prisma.submission.findMany({
      where: {
        taskId,
      },
      orderBy: {
        versionNumber: 'desc',
      },
      include: {
        task: true,
        page: true,
      },
    });
  }
}

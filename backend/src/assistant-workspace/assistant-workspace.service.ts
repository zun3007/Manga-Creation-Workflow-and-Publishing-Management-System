import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AssistantWorkspaceService {
  constructor(private readonly prisma: PrismaService) {}

  async getWorkspace(assistantUserId: number) {
    const tasks = await this.prisma.task.findMany({
      where: {
        assigneeUserId: assistantUserId,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    const submissions = await this.prisma.submission.findMany({
      where: {
        assistantUserId,
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });

    const assignedTasks = tasks.filter((task: any) => task.status === 'ASSIGNED');
    const inProgressTasks = tasks.filter((task: any) => task.status === 'IN_PROGRESS');
    const submittedTasks = tasks.filter((task: any) => task.status === 'SUBMITTED');
    const approvedTasks = tasks.filter((task: any) => task.status === 'APPROVED');
    const revisionTasks = tasks.filter(
      (task: any) => task.status === 'REVISION_REQUESTED',
    );

    const totalApprovedAmount = approvedTasks.reduce((sum: number, task: any) => {
      return sum + Number(task.paymentAmount ?? 0);
    }, 0);

    const latestActivities = [
      ...tasks.map((task: any) => ({
        type: 'TASK',
        title: `Task #${task.id}`,
        message: task.description,
        status: task.status,
        time: task.updatedAt,
        taskId: task.id,
        pageId: task.pageId,
      })),
      ...submissions.map((submission: any) => ({
        type: 'SUBMISSION',
        title: `Submission #${submission.id}`,
        message: submission.feedback ?? 'Submission uploaded',
        status: submission.status,
        time: submission.reviewedAt ?? submission.submittedAt,
        submissionId: submission.id,
        taskId: submission.taskId,
        pageId: submission.pageId,
      })),
    ]
      .sort((a: any, b: any) => {
        return new Date(b.time).getTime() - new Date(a.time).getTime();
      })
      .slice(0, 10);

    return {
      assistantUserId,
      summary: {
        totalTasks: tasks.length,
        assignedTasks: assignedTasks.length,
        inProgressTasks: inProgressTasks.length,
        submittedTasks: submittedTasks.length,
        approvedTasks: approvedTasks.length,
        revisionTasks: revisionTasks.length,
        totalSubmissions: submissions.length,
        totalApprovedAmount,
        currency: 'VND',
      },
      sections: {
        assignedTasks,
        inProgressTasks,
        submittedTasks,
        approvedTasks,
        revisionTasks,
        submissions,
        latestActivities,
      },
    };
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EarningsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAssistantEarnings(assistantUserId: number) {
    const tasks = await this.prisma.task.findMany({
      where: {
        assigneeUserId: assistantUserId,
        status: 'APPROVED' as any,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return tasks.map((task: any) => ({
      taskId: task.id,
      pageId: task.pageId,
      regionId: task.regionId,
      description: task.description,
      status: task.status,
      paymentAmount: task.paymentAmount,
      approvedAt: task.updatedAt,
    }));
  }

  async getAssistantSummary(assistantUserId: number) {
    const earnings = await this.findAssistantEarnings(assistantUserId);

    const totalAmount = earnings.reduce((sum: number, item: any) => {
      return sum + Number(item.paymentAmount ?? 0);
    }, 0);

    return {
      assistantUserId,
      totalApprovedTasks: earnings.length,
      totalAmount,
      currency: 'VND',
      earnings,
    };
  }
}

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  SubmissionStatus,
  TaskStatus,
  UserRole,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { StudioNotificationsService } from '../studio-notifications/studio-notifications.service';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studioNotificationsService: StudioNotificationsService,
  ) {}

  // Kiểm tra region thuộc Mangaka
  private async findOwnedRegion(regionId: number, mangakaUserId: number) {
    const region = await this.prisma.region.findUnique({
      where: { id: regionId },
      include: {
        page: {
          include: {
            chapter: {
              include: {
                series: true,
              },
            },
          },
        },
      },
    });

    if (!region) {
      throw new NotFoundException('Region not found');
    }

    if (region.page.chapter.series.mangakaUserId !== mangakaUserId) {
      throw new ForbiddenException(
        'You do not have permission to create task for this region',
      );
    }

    return region;
  }

  // Kiểm tra user assignee là Assistant
  private async findAssistant(assistantUserId: number) {
    const assistant = await this.prisma.user.findUnique({
      where: { id: assistantUserId },
    });

    if (!assistant) {
      throw new NotFoundException('Assistant not found');
    }

    if (assistant.role !== UserRole.ASSISTANT) {
      throw new BadRequestException('Assignee must have ASSISTANT role');
    }

    return assistant;
  }

  // Mangaka tạo task
  async create(mangakaUserId: number, dto: CreateTaskDto) {
    const region = await this.findOwnedRegion(dto.regionId, mangakaUserId);

    await this.findAssistant(dto.assigneeUserId);

    return this.prisma.task.create({
      data: {
        regionId: dto.regionId,
        pageId: region.pageId,
        assignorUserId: mangakaUserId,
        assigneeUserId: dto.assigneeUserId,
        taskPriceRuleId: dto.taskPriceRuleId,
        description: dto.description,
        instruction: dto.instruction,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
        paymentAmount: dto.paymentAmount ?? 0,
      },
      include: {
        region: true,
        page: true,
        assignor: {
          select: {
            id: true,
            displayName: true,
            email: true,
            role: true,
          },
        },
        assignee: {
          select: {
            id: true,
            displayName: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  // Mangaka xem task mình đã giao
  async findCreatedByMe(assignorUserId: number) {
    return this.prisma.task.findMany({
      where: {
        assignorUserId,
      },
      include: {
        assignee: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        region: {
          select: {
            id: true,
            type: true,
            xCoordinate: true,
            yCoordinate: true,
            width: true,
            height: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Assistant xem task được giao
  async findAssignedToMe(assistantUserId: number) {
    return this.prisma.task.findMany({
      where: {
        assigneeUserId: assistantUserId,
      },
      include: {
        region: {
          select: {
            id: true,
            type: true,
            xCoordinate: true,
            yCoordinate: true,
            width: true,
            height: true,
          },
        },
        page: {
          select: {
            id: true,
            pageNumber: true,
            status: true,
            versions: {
              orderBy: {
                versionNumber: 'desc',
              },
              take: 1,
              select: {
                id: true,
                versionNumber: true,
                imageUrl: true,
                uploadNote: true,
                createdAt: true,
              },
            },
          },
        },
        submissions: {
          orderBy: {
            submittedAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Xem chi tiết task
  async findOne(id: number, userId: number) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        region: true,
        page: true,
        assignor: {
          select: {
            id: true,
            displayName: true,
            email: true,
            role: true,
          },
        },
        assignee: {
          select: {
            id: true,
            displayName: true,
            email: true,
            role: true,
          },
        },
        submissions: {
          orderBy: {
            versionNumber: 'desc',
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.assignorUserId !== userId && task.assigneeUserId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to view this task',
      );
    }

    await this.studioNotificationsService.createNotification({
      userId: Number(task.assigneeUserId),
      title: 'New task assigned',
      message: `You have been assigned a new task: ${
        task.description ?? 'Manga production task'
      }.`,
      type: 'TASK',
    });

    return task;
  }

  // Assistant nhận task
  async accept(id: number, assistantUserId: number) {
    const task = await this.findOne(id, assistantUserId);

    if (task.assigneeUserId !== assistantUserId) {
      throw new ForbiddenException('You are not assigned to this task');
    }

    if (task.status !== TaskStatus.ASSIGNED) {
      throw new BadRequestException('Only assigned task can be accepted');
    }

    return this.prisma.task.update({
      where: { id },
      data: {
        status: TaskStatus.IN_PROGRESS,
      },
    });
  }

  // Assistant submit kết quả
  async submit(id: number, assistantUserId: number, dto: CreateSubmissionDto) {
    const task = await this.findOne(id, assistantUserId);

    if (task.assigneeUserId !== assistantUserId) {
      throw new ForbiddenException('You are not assigned to this task');
    }

    const allowedStatuses: TaskStatus[] = [
      TaskStatus.ASSIGNED,
      TaskStatus.IN_PROGRESS,
      TaskStatus.REVISION_REQUESTED,
    ];

    if (!allowedStatuses.includes(task.status)) {
      throw new BadRequestException(
        `Task must be assigned or in progress before submission. Current status: ${task.status}`,
      );
    }

    const nextVersion = task.submissions.length + 1;

    return this.prisma.$transaction(async (transaction) => {
      const submission = await transaction.submission.create({
        data: {
          taskId: task.id,
          pageId: task.pageId,
          assistantUserId,
          versionNumber: nextVersion,
          fileUrl: dto.fileUrl,
          feedback: dto.feedback,
          status: SubmissionStatus.SUBMITTED,
        },
      });

      await transaction.task.update({
        where: { id },
        data: {
          status: TaskStatus.SUBMITTED,
        },
      });

      return submission;
    });
  }

  async findMySubmissions(assistantUserId: number) {
    return this.prisma.submission.findMany({
      where: {
        assistantUserId,
      },
      include: {
        task: {
          select: {
            id: true,
            description: true,
            instruction: true,
            status: true,
            paymentAmount: true,
            deadline: true,
            region: {
              select: {
                id: true,
                type: true,
                xCoordinate: true,
                yCoordinate: true,
                width: true,
                height: true,
              },
            },
          },
        },
        page: {
          select: {
            id: true,
            pageNumber: true,
            status: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });
  }

  async getAssistantOptions() {
    const activeStatuses = new Set<TaskStatus>([
      TaskStatus.ASSIGNED,
      TaskStatus.IN_PROGRESS,
      TaskStatus.SUBMITTED,
      TaskStatus.REVISION_REQUESTED,
    ]);

    const assistants = await this.prisma.user.findMany({
      where: {
        role: UserRole.ASSISTANT,
        isActive: true,
      },
      select: {
        id: true,
        displayName: true,
        email: true,
        avatarUrl: true,
        role: true,
        assistantProfile: true,
        assignedTasks: {
          select: {
            id: true,
            status: true,
            deadline: true,
            paymentAmount: true,
          },
        },
      },
      orderBy: {
        displayName: 'asc',
      },
    });

    return assistants.map((assistant) => {
      const currentTasks = assistant.assignedTasks.filter((task) =>
        activeStatuses.has(task.status),
      ).length;

      const completedTasks = assistant.assignedTasks.filter((task) => {
        return task.status === TaskStatus.APPROVED;
      }).length;

      const totalAssignedTasks = assistant.assignedTasks.length;

      return {
        id: assistant.id,
        displayName: assistant.displayName,
        email: assistant.email,
        avatarUrl: assistant.avatarUrl,
        role: assistant.role,
        skillSet: assistant.assistantProfile?.skillSet ?? null,
        salaryRate: assistant.assistantProfile?.salaryRate
          ? Number(assistant.assistantProfile.salaryRate)
          : 0,
        totalEarnings: assistant.assistantProfile?.totalEarnings
          ? Number(assistant.assistantProfile.totalEarnings)
          : 0,
        currentTasks,
        completedTasks,
        totalAssignedTasks,
        status: currentTasks >= 5 ? 'Busy' : 'Available',
      };
    });
  }

  async getMyEarnings(assistantUserId: number) {
    const tasks = await this.prisma.task.findMany({
      where: {
        assigneeUserId: assistantUserId,
      },
      include: {
        region: {
          select: {
            id: true,
            type: true,
          },
        },
        page: {
          select: {
            id: true,
            pageNumber: true,
          },
        },
        submissions: {
          orderBy: {
            versionNumber: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const totalTasks = tasks.length;

    const submittedTasks = tasks.filter((task) => task.status === 'SUBMITTED');

    const approvedTasks = tasks.filter((task) => task.status === 'APPROVED');

    const inProgressTasks = tasks.filter(
      (task) => task.status === 'IN_PROGRESS' || task.status === 'ASSIGNED',
    );

    const submittedAmount = submittedTasks.reduce((total, task) => {
      return total + Number(task.paymentAmount ?? 0);
    }, 0);

    const approvedAmount = approvedTasks.reduce((total, task) => {
      return total + Number(task.paymentAmount ?? 0);
    }, 0);

    const pendingAmount = inProgressTasks.reduce((total, task) => {
      return total + Number(task.paymentAmount ?? 0);
    }, 0);

    return {
      summary: {
        totalTasks,
        submittedTasks: submittedTasks.length,
        approvedTasks: approvedTasks.length,
        inProgressTasks: inProgressTasks.length,
        submittedAmount,
        approvedAmount,
        pendingAmount,
        totalPotentialAmount: submittedAmount + approvedAmount + pendingAmount,
      },
      items: tasks.map((task) => ({
        id: task.id,
        description: task.description,
        status: task.status,
        paymentAmount: task.paymentAmount,
        deadline: task.deadline,
        createdAt: task.createdAt,
        region: task.region,
        page: task.page,
        latestSubmission: task.submissions[0] ?? null,
      })),
    };
  }

  async findSubmissionsForReview(assignorUserId: number) {
    return this.prisma.submission.findMany({
      where: {
        task: {
          assignorUserId,
        },
      },
      include: {
        assistant: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        task: {
          select: {
            id: true,
            description: true,
            instruction: true,
            status: true,
            paymentAmount: true,
            deadline: true,
            region: {
              select: {
                id: true,
                type: true,
                xCoordinate: true,
                yCoordinate: true,
                width: true,
                height: true,
              },
            },
          },
        },
        page: {
          select: {
            id: true,
            pageNumber: true,
            status: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });
  }

  async approveSubmission(
    submissionId: number,
    reviewerUserId: number,
    reviewerRole: UserRole,
  ) {
    const submission = await this.prisma.submission.findFirst({
      where:
        reviewerRole === UserRole.TANTOU_EDITOR
          ? {
              id: submissionId,
            }
          : {
              id: submissionId,
              task: {
                assignorUserId: reviewerUserId,
              },
            },
      include: {
        task: true,
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    if (submission.status !== SubmissionStatus.SUBMITTED) {
      throw new BadRequestException(
        'Only submitted submissions can be approved',
      );
    }

    return this.prisma.$transaction(async (transaction) => {
      const updatedSubmission = await transaction.submission.update({
        where: {
          id: submissionId,
        },
        data: {
          status: SubmissionStatus.APPROVED,
          reviewedByUserId: reviewerUserId,
          reviewedAt: new Date(),
        },
      });

      await transaction.task.update({
        where: {
          id: submission.taskId,
        },
        data: {
          status: TaskStatus.APPROVED,
        },
      });

      await this.studioNotificationsService.createNotification({
        userId: Number(submission.task.assigneeUserId),
        title: 'Submission approved',
        message: `Your submission has been approved: ${
          submission.task.description ?? 'Manga production task'
        }.`,
        type: 'SUBMISSION_APPROVED',
      });

      return updatedSubmission;
    });
  }

  async requestSubmissionRevision(
    submissionId: number,
    reviewerUserId: number,
    reviewerRole: UserRole,
    feedback?: string,
  ) {
    const cleanFeedback = feedback?.trim();

    if (!cleanFeedback) {
      throw new BadRequestException('Revision feedback is required');
    }

    const submission = await this.prisma.submission.findFirst({
      where:
        reviewerRole === UserRole.TANTOU_EDITOR
          ? {
              id: submissionId,
            }
          : {
              id: submissionId,
              task: {
                assignorUserId: reviewerUserId,
              },
            },
      include: {
        task: true,
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    if (submission.status !== SubmissionStatus.SUBMITTED) {
      throw new BadRequestException(
        'Only submitted submissions can be sent back for revision',
      );
    }

    return this.prisma.$transaction(async (transaction) => {
      const updatedSubmission = await transaction.submission.update({
        where: {
          id: submissionId,
        },
        data: {
          status: SubmissionStatus.REVISION_REQUESTED,
          feedback: cleanFeedback,
          reviewedByUserId: reviewerUserId,
          reviewedAt: new Date(),
        },
      });

      await transaction.task.update({
        where: {
          id: submission.taskId,
        },
        data: {
          status: TaskStatus.REVISION_REQUESTED,
        },
      });

      await this.studioNotificationsService.createNotification({
        userId: Number(submission.task.assigneeUserId),
        title: 'Revision requested',
        message: `Revision requested for task: ${
          submission.task.description ?? 'Manga production task'
        }. Please check the reviewer feedback.`,
        type: 'REVISION_REQUESTED',
      });

      return updatedSubmission;
    });
  }

  async findSubmissionsForEditorReview() {
    return this.prisma.submission.findMany({
      include: {
        assistant: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        task: {
          select: {
            id: true,
            description: true,
            instruction: true,
            status: true,
            paymentAmount: true,
            deadline: true,
            assignor: {
              select: {
                id: true,
                displayName: true,
                email: true,
              },
            },
            region: {
              select: {
                id: true,
                type: true,
                xCoordinate: true,
                yCoordinate: true,
                width: true,
                height: true,
              },
            },
          },
        },
        page: {
          select: {
            id: true,
            pageNumber: true,
            status: true,
            chapter: {
              select: {
                id: true,
                chapterNumber: true,
                title: true,
                series: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });
  }

  async getEditorProductionOverview() {
    const [tasks, submissions] = await Promise.all([
      this.prisma.task.findMany({
        include: {
          assignee: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
          assignor: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
          page: {
            select: {
              id: true,
              pageNumber: true,
              status: true,
            },
          },
          region: {
            select: {
              id: true,
              type: true,
            },
          },
          submissions: {
            orderBy: {
              versionNumber: 'desc',
            },
            take: 1,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),

      this.prisma.submission.findMany({
        include: {
          assistant: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
          task: {
            select: {
              id: true,
              description: true,
              status: true,
              paymentAmount: true,
            },
          },
          page: {
            select: {
              id: true,
              pageNumber: true,
              status: true,
            },
          },
        },
        orderBy: {
          submittedAt: 'desc',
        },
        take: 10,
      }),
    ]);

    const totalTasks = tasks.length;
    const assignedTasks = tasks.filter(
      (task) => task.status === 'ASSIGNED',
    ).length;
    const inProgressTasks = tasks.filter(
      (task) => task.status === 'IN_PROGRESS',
    ).length;
    const submittedTasks = tasks.filter(
      (task) => task.status === 'SUBMITTED',
    ).length;
    const approvedTasks = tasks.filter(
      (task) => task.status === 'APPROVED',
    ).length;
    const revisionTasks = tasks.filter(
      (task) => task.status === 'REVISION_REQUESTED',
    ).length;

    const waitingReviewSubmissions = submissions.filter(
      (submission) => submission.status === 'SUBMITTED',
    ).length;

    const approvedSubmissions = submissions.filter(
      (submission) => submission.status === 'APPROVED',
    ).length;

    return {
      summary: {
        totalTasks,
        assignedTasks,
        inProgressTasks,
        submittedTasks,
        approvedTasks,
        revisionTasks,
        waitingReviewSubmissions,
        approvedSubmissions,
      },
      latestTasks: tasks.slice(0, 8).map((task) => ({
        id: task.id,
        description: task.description,
        status: task.status,
        paymentAmount: task.paymentAmount,
        deadline: task.deadline,
        createdAt: task.createdAt,
        assignee: task.assignee,
        assignor: task.assignor,
        page: task.page,
        region: task.region,
        latestSubmission: task.submissions[0] ?? null,
      })),
      latestSubmissions: submissions,
    };
  }

  async getMySubmissions(userId: number) {
    return (this.prisma as any).submission.findMany({
      where: {
        assistantUserId: Number(userId),
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

  async getReviewSubmissions(userId: number) {
    return (this.prisma as any).submission.findMany({
      where: {
        task: {
          assignorUserId: Number(userId),
        },
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

  async getEditorReviewSubmissions(userId: number) {
    return (this.prisma as any).submission.findMany({
      where: {
        status: 'SUBMITTED',
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

  async createSubmission(
    taskId: number | string,
    assistantUserId: number,
    body: any,
  ) {
    const task = await (this.prisma as any).task.findUnique({
      where: {
        id: Number(taskId),
      },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    const latestSubmission = await (this.prisma as any).submission.findFirst({
      where: {
        taskId: Number(taskId),
      },
      orderBy: {
        versionNumber: 'desc',
      },
    });

    const versionNumber =
      body?.versionNumber !== undefined
        ? Number(body.versionNumber)
        : Number(latestSubmission?.versionNumber ?? 0) + 1;

    const submission = await (this.prisma as any).submission.create({
      data: {
        taskId: Number(taskId),
        pageId: Number(task.pageId),
        assistantUserId: Number(assistantUserId),
        versionNumber,
        fileUrl: body?.fileUrl ?? body?.file_url ?? body?.url ?? '',
        status: 'SUBMITTED',
        feedback: body?.feedback ?? body?.note ?? null,
      },
    });

    await (this.prisma as any).task.update({
      where: {
        id: Number(taskId),
      },
      data: {
        status: 'SUBMITTED',
      },
    });

    return submission;
  }

  async requestRevision(
    submissionId: number | string,
    reviewerUserId: number,
    body: any,
  ) {
    const submission = await (this.prisma as any).submission.findUnique({
      where: {
        id: Number(submissionId),
      },
      include: {
        task: true,
      },
    });

    if (!submission) {
      throw new Error('Submission not found');
    }

    const updatedSubmission = await (this.prisma as any).submission.update({
      where: {
        id: Number(submissionId),
      },
      data: {
        status: 'REVISION_REQUESTED',
        feedback:
          body?.feedback ??
          body?.note ??
          body?.reason ??
          'Please revise your submission.',
        reviewedByUserId: Number(reviewerUserId),
        reviewedAt: new Date(),
      },
    });

    await (this.prisma as any).task.update({
      where: {
        id: Number(submission.taskId),
      },
      data: {
        status: 'REVISION_REQUESTED',
      },
    });

    const revisionTaskRows = await this.prisma.$queryRaw<
      {
        task_id: number;
        assignee_user_id: number;
        description: string | null;
      }[]
    >`
  SELECT
    task_id,
    assignee_user_id,
    description
  FROM tasks
  WHERE task_id = ${Number(submission.taskId)}
  LIMIT 1
`;

    const revisionTask = revisionTaskRows[0];

    if (revisionTask) {
      await this.studioNotificationsService.createNotification({
        userId: Number(revisionTask.assignee_user_id),
        title: 'Revision requested',
        message: `Revision requested for task: ${
          revisionTask.description ?? 'Manga production task'
        }. Please check the reviewer feedback.`,
        type: 'REVISION_REQUESTED',
      });
    }

    return updatedSubmission;
  }
}

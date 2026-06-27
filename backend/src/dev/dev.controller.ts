import { Controller, Get, Post } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function getErrorInfo(error: unknown) {
  const err = error as any;

  return {
    name: err?.name,
    message: err?.message,
    code: err?.code,
    meta: err?.meta,
  };
}

@Controller('dev')
export class DevController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('debug-data')
  async debugData() {
    try {
      const pages = await this.prisma.page.findMany({
        take: 3,
        orderBy: { id: 'asc' },
      });

      const pageVersions = await this.prisma.pageVersion.findMany({
        take: 5,
        orderBy: { id: 'asc' },
      });

      const regions = await this.prisma.region.findMany({
        take: 3,
        orderBy: { id: 'asc' },
      });

      const tasks = await this.prisma.task.findMany({
        take: 3,
        orderBy: { id: 'asc' },
      });

      const submissions = await this.prisma.submission.findMany({
        take: 3,
        orderBy: { id: 'asc' },
      });

      return {
        pages,
        pageVersions,
        regions,
        tasks,
        submissions,
      };
    } catch (error) {
      return {
        stage: 'debug-data',
        error: getErrorInfo(error),
      };
    }
  }

  @Post('seed-task-submission')
  async seedTaskSubmission() {
    let page: any;
    let pageVersion: any;
    let region: any;
    let task: any;
    let submission: any;

    try {
      page = await this.prisma.page.findFirst({
        orderBy: { id: 'asc' },
      });
    } catch (error) {
      return {
        stage: 'find-page',
        error: getErrorInfo(error),
      };
    }

    if (!page) {
      return {
        stage: 'find-page',
        message: 'No page found. Need to create series/chapter/page first.',
      };
    }

    try {
      pageVersion = await this.prisma.pageVersion.findFirst({
        where: {
          pageId: page.id,
        },
        orderBy: {
          versionNumber: 'desc',
        },
      });

      if (!pageVersion) {
        pageVersion = await this.prisma.pageVersion.create({
          data: {
            page: {
              connect: { id: page.id },
            },
            uploadedBy: {
              connect: { id: 2 },
            },
            versionNumber: page.currentVersion ?? 1,
            imageUrl: 'https://example.com/page-version.png',
            uploadNote: 'Dev seed page version',
          } as any,
        });
      }
    } catch (error) {
      return {
        stage: 'find-or-create-page-version',
        page,
        error: getErrorInfo(error),
      };
    }

    try {
      region = await this.prisma.region.create({
        data: {
          page: {
            connect: { id: page.id },
          },
          pageVersion: {
            connect: { id: pageVersion.id },
          },
          type: 'PANEL' as any,
          xCoordinate: 10,
          yCoordinate: 10,
          width: 200,
          height: 150,
          zIndex: 0,
          aiSuggested: false,
        } as any,
      });
    } catch (error) {
      return {
        stage: 'create-region',
        page,
        pageVersion,
        error: getErrorInfo(error),
      };
    }

    try {
      task = await this.prisma.task.create({
        data: {
          region: {
            connect: { id: region.id },
          },
          page: {
            connect: { id: page.id },
          },
          assignor: {
            connect: { id: 2 },
          },
          assignee: {
            connect: { id: 3 },
          },
          description: 'Draw background for this panel',
          instruction: 'Please clean the background and add more depth.',
          deadline: new Date('2026-06-25T17:00:00.000Z'),
          status: 'ASSIGNED' as any,
          paymentAmount: 120000,
        } as any,
      });
    } catch (error) {
      return {
        stage: 'create-task',
        page,
        pageVersion,
        region,
        error: getErrorInfo(error),
      };
    }

    try {
      submission = await this.prisma.submission.create({
        data: {
          task: {
            connect: { id: task.id },
          },
          page: {
            connect: { id: page.id },
          },
          assistant: {
            connect: { id: 3 },
          },
          versionNumber: 1,
          fileUrl: 'https://example.com/submission.png',
          status: 'SUBMITTED' as any,
          feedback: 'Em nộp bản vẽ hoàn chỉnh',
        } as any,
      });
    } catch (error) {
      return {
        stage: 'create-submission',
        page,
        pageVersion,
        region,
        task,
        error: getErrorInfo(error),
      };
    }

    return {
      message: 'Seed task and submission successfully',
      page,
      pageVersion,
      region,
      task,
      submission,
    };
  }
}

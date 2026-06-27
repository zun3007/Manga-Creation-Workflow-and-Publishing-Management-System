import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PublicationWorkspaceService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const upcomingSchedules = await this.prisma.publicationSchedule.findMany({
      where: {
        status: 'SCHEDULED' as any,
      },
      orderBy: {
        releaseDate: 'asc',
      },
      include: {
        chapter: true,
      },
    });

    const publishedSchedules = await this.prisma.publicationSchedule.findMany({
      where: {
        status: 'PUBLISHED' as any,
      },
      orderBy: {
        publishedAt: 'desc',
      },
      take: 10,
      include: {
        chapter: true,
      },
    });

    const cancelledSchedules = await this.prisma.publicationSchedule.findMany({
      where: {
        status: 'CANCELLED' as any,
      },
      orderBy: {
        scheduledAt: 'desc',
      },
      take: 10,
      include: {
        chapter: true,
      },
    });

    return {
      summary: {
        upcomingCount: upcomingSchedules.length,
        publishedCount: publishedSchedules.length,
        cancelledCount: cancelledSchedules.length,
      },
      sections: {
        upcomingSchedules,
        publishedSchedules,
        cancelledSchedules,
      },
    };
  }

  async getUpcomingSchedules() {
    return this.prisma.publicationSchedule.findMany({
      where: {
        status: 'SCHEDULED' as any,
      },
      orderBy: {
        releaseDate: 'asc',
      },
      include: {
        chapter: true,
      },
    });
  }

  async getHistory() {
    return this.prisma.publicationSchedule.findMany({
      where: {
        status: {
          in: ['PUBLISHED', 'CANCELLED'] as any,
        },
      },
      orderBy: {
        scheduledAt: 'desc',
      },
      include: {
        chapter: true,
      },
    });
  }

  async createSchedule(body: {
    chapterId: number;
    scheduledByUserId: number;
    releaseDate: string;
  }) {
    const chapter = await this.prisma.chapter.findUnique({
      where: {
        id: body.chapterId,
      },
    });

    if (!chapter) {
      throw new NotFoundException('Chapter not found');
    }

    const schedule = await this.prisma.publicationSchedule.create({
      data: {
        chapter: {
          connect: { id: body.chapterId },
        },
        scheduledBy: {
          connect: { id: body.scheduledByUserId },
        },
        releaseDate: new Date(body.releaseDate),
        status: 'SCHEDULED' as any,
      } as any,
      include: {
        chapter: true,
      },
    });

    await this.prisma.chapter.update({
      where: {
        id: body.chapterId,
      },
      data: {
        status: 'SCHEDULED' as any,
      },
    });

    return schedule;
  }

  async publishSchedule(id: number) {
    const schedule = await this.prisma.publicationSchedule.findUnique({
      where: { id },
    });

    if (!schedule) {
      throw new NotFoundException('Publication schedule not found');
    }

    const updatedSchedule = await this.prisma.publicationSchedule.update({
      where: { id },
      data: {
        status: 'PUBLISHED' as any,
        publishedAt: new Date(),
      } as any,
      include: {
        chapter: true,
      },
    });

    await this.prisma.chapter.update({
      where: {
        id: (schedule as any).chapterId,
      },
      data: {
        status: 'PUBLISHED' as any,
        isLocked: true,
      } as any,
    });

    return updatedSchedule;
  }

  async cancelSchedule(id: number) {
    const schedule = await this.prisma.publicationSchedule.findUnique({
      where: { id },
    });

    if (!schedule) {
      throw new NotFoundException('Publication schedule not found');
    }

    return this.prisma.publicationSchedule.update({
      where: { id },
      data: {
        status: 'CANCELLED' as any,
      } as any,
      include: {
        chapter: true,
      },
    });
  }
}

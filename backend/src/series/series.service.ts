import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SeriesService {
  constructor(private readonly prisma: PrismaService) {}

  // Lấy series của Mangaka đang đăng nhập
  async findMine(mangakaUserId: number) {
    return this.prisma.series.findMany({
      where: {
        mangakaUserId,
      },
      include: {
        genres: {
          include: {
            genre: true,
          },
        },
        chapters: {
          orderBy: {
            chapterNumber: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Lấy chi tiết 1 series
  async findOne(id: number) {
    return this.prisma.series.findUnique({
      where: { id },
      include: {
        genres: {
          include: {
            genre: true,
          },
        },
        chapters: {
          orderBy: {
            chapterNumber: 'asc',
          },
        },
      },
    });
  }
}
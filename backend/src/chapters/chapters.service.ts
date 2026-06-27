import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';

@Injectable()
export class ChaptersService {
  constructor(private readonly prisma: PrismaService) {}

  // Kiểm tra series có thuộc Mangaka hiện tại không
  private async findOwnedSeries(
    seriesId: number,
    mangakaUserId: number,
  ) {
    const series = await this.prisma.series.findUnique({
      where: { id: seriesId },
    });

    if (!series) {
      throw new NotFoundException('Series not found');
    }

    if (series.mangakaUserId !== mangakaUserId) {
      throw new ForbiddenException(
        'You do not have permission to manage this series',
      );
    }

    return series;
  }

  // Tạo chapter mới
  async create(
    mangakaUserId: number,
    dto: CreateChapterDto,
  ) {
    await this.findOwnedSeries(dto.seriesId, mangakaUserId);

    const existingChapter = await this.prisma.chapter.findUnique({
      where: {
        seriesId_chapterNumber: {
          seriesId: dto.seriesId,
          chapterNumber: dto.chapterNumber,
        },
      },
    });

    if (existingChapter) {
      throw new BadRequestException(
        'Chapter number already exists in this series',
      );
    }

    return this.prisma.chapter.create({
      data: {
        seriesId: dto.seriesId,
        chapterNumber: dto.chapterNumber,
        title: dto.title,
        deadline: dto.deadline
          ? new Date(dto.deadline)
          : undefined,
      },
    });
  }

  // Lấy chapter theo series
  async findBySeries(
    seriesId: number,
    mangakaUserId: number,
  ) {
    await this.findOwnedSeries(seriesId, mangakaUserId);

    return this.prisma.chapter.findMany({
      where: { seriesId },
      orderBy: {
        chapterNumber: 'asc',
      },
    });
  }

  // Xem chi tiết chapter
  async findOne(
    id: number,
    mangakaUserId: number,
  ) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id },
      include: {
        series: true,
      },
    });

    if (!chapter) {
      throw new NotFoundException('Chapter not found');
    }

    if (chapter.series.mangakaUserId !== mangakaUserId) {
      throw new ForbiddenException(
        'You do not have permission to view this chapter',
      );
    }

    return chapter;
  }

  // Cập nhật chapter
  async update(
    id: number,
    mangakaUserId: number,
    dto: UpdateChapterDto,
  ) {
    const chapter = await this.findOne(id, mangakaUserId);

    if (chapter.isLocked) {
      throw new BadRequestException(
        'Locked chapter cannot be updated',
      );
    }

    return this.prisma.chapter.update({
      where: { id },
      data: {
        title: dto.title,
        deadline: dto.deadline
          ? new Date(dto.deadline)
          : undefined,
        status: dto.status,
      },
    });
  }
}
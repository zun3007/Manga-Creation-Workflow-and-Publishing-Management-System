import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PageStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePageDto } from './dto/create-page.dto';
import { CreatePageVersionDto } from './dto/create-page-version.dto';

@Injectable()
export class PagesService {
  constructor(private readonly prisma: PrismaService) {}

  // Kiểm tra chapter có thuộc Mangaka hiện tại không
  private async findOwnedChapter(
    chapterId: number,
    mangakaUserId: number,
  ) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        series: true,
      },
    });

    if (!chapter) {
      throw new NotFoundException('Chapter not found');
    }

    if (chapter.series.mangakaUserId !== mangakaUserId) {
      throw new ForbiddenException(
        'You do not have permission to manage this chapter',
      );
    }

    return chapter;
  }

  // Tạo page và version ảnh đầu tiên
  async create(
    mangakaUserId: number,
    dto: CreatePageDto,
  ) {
    const chapter = await this.findOwnedChapter(
      dto.chapterId,
      mangakaUserId,
    );

    if (chapter.isLocked) {
      throw new BadRequestException(
        'Locked chapter cannot receive new pages',
      );
    }

    const existingPage = await this.prisma.page.findUnique({
      where: {
        chapterId_pageNumber: {
          chapterId: dto.chapterId,
          pageNumber: dto.pageNumber,
        },
      },
    });

    if (existingPage) {
      throw new BadRequestException(
        'Page number already exists in this chapter',
      );
    }

    return this.prisma.$transaction(async (transaction) => {
      const page = await transaction.page.create({
        data: {
          chapterId: dto.chapterId,
          pageNumber: dto.pageNumber,
          currentVersion: 1,
          status: PageStatus.DRAFT,
        },
      });

      await transaction.pageVersion.create({
        data: {
          pageId: page.id,
          uploadedByUserId: mangakaUserId,
          versionNumber: 1,
          imageUrl: dto.imageUrl,
          uploadNote: dto.uploadNote,
        },
      });

      return transaction.page.findUnique({
        where: { id: page.id },
        include: {
          versions: {
            orderBy: {
              versionNumber: 'desc',
            },
          },
        },
      });
    });
  }

  // Xem danh sách page theo chapter
  async findByChapter(
    chapterId: number,
    mangakaUserId: number,
  ) {
    await this.findOwnedChapter(chapterId, mangakaUserId);

    return this.prisma.page.findMany({
      where: { chapterId },
      include: {
        versions: {
          orderBy: {
            versionNumber: 'desc',
          },
        },
      },
      orderBy: {
        pageNumber: 'asc',
      },
    });
  }

  // Xem chi tiết page
  async findOne(
    id: number,
    mangakaUserId: number,
  ) {
    const page = await this.prisma.page.findUnique({
      where: { id },
      include: {
        chapter: {
          include: {
            series: true,
          },
        },
        versions: {
          orderBy: {
            versionNumber: 'desc',
          },
        },
      },
    });

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    if (page.chapter.series.mangakaUserId !== mangakaUserId) {
      throw new ForbiddenException(
        'You do not have permission to view this page',
      );
    }

    return page;
  }

  // Thêm version ảnh mới
  async addVersion(
    id: number,
    mangakaUserId: number,
    dto: CreatePageVersionDto,
  ) {
    const page = await this.findOne(id, mangakaUserId);

    if (page.chapter.isLocked) {
      throw new BadRequestException(
        'Locked chapter cannot receive new page versions',
      );
    }

    const nextVersion = page.currentVersion + 1;

    return this.prisma.$transaction(async (transaction) => {
      await transaction.pageVersion.create({
        data: {
          pageId: id,
          uploadedByUserId: mangakaUserId,
          versionNumber: nextVersion,
          imageUrl: dto.imageUrl,
          uploadNote: dto.uploadNote,
        },
      });

      return transaction.page.update({
        where: { id },
        data: {
          currentVersion: nextVersion,
          status: PageStatus.IN_PROGRESS,
        },
        include: {
          versions: {
            orderBy: {
              versionNumber: 'desc',
            },
          },
        },
      });
    });
  }
}
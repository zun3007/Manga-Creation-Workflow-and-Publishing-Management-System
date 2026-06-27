import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRegionDto } from './dto/create-region.dto';
import { UpdateRegionDto } from './dto/update-region.dto';

@Injectable()
export class RegionsService {
  constructor(private readonly prisma: PrismaService) {}

  // Kiểm tra page thuộc Mangaka hiện tại
  private async findOwnedPage(pageId: number, mangakaUserId: number) {
    const page = await this.prisma.page.findUnique({
      where: { id: pageId },
      include: {
        chapter: {
          include: {
            series: true,
          },
        },
      },
    });

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    if (page.chapter.series.mangakaUserId !== mangakaUserId) {
      throw new ForbiddenException(
        'You do not have permission to manage this page',
      );
    }

    return page;
  }

  // Lấy current page version
  private async findCurrentPageVersion(pageId: number) {
    const page = await this.prisma.page.findUnique({
      where: { id: pageId },
    });

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    const pageVersion = await this.prisma.pageVersion.findFirst({
      where: {
        pageId,
        versionNumber: page.currentVersion,
      },
    });

    if (!pageVersion) {
      throw new BadRequestException(
        'Current page version not found',
      );
    }

    return pageVersion;
  }

  // Tạo region mới
  async create(mangakaUserId: number, dto: CreateRegionDto) {
    await this.findOwnedPage(dto.pageId, mangakaUserId);

    const pageVersion = await this.findCurrentPageVersion(dto.pageId);

    return this.prisma.region.create({
      data: {
        pageId: dto.pageId,
        pageVersionId: pageVersion.id,
        type: dto.regionType,
        xCoordinate: dto.x,
        yCoordinate: dto.y,
        width: dto.width,
        height: dto.height,
      },
    });
  }

  // Lấy region theo page
  async findByPage(pageId: number, mangakaUserId: number) {
    await this.findOwnedPage(pageId, mangakaUserId);

    return this.prisma.region.findMany({
      where: { pageId },
      orderBy: {
        id: 'asc',
      },
    });
  }

  // Xem chi tiết region
  async findOne(id: number, mangakaUserId: number) {
    const region = await this.prisma.region.findUnique({
      where: { id },
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
        pageVersion: true,
      },
    });

    if (!region) {
      throw new NotFoundException('Region not found');
    }

    if (region.page.chapter.series.mangakaUserId !== mangakaUserId) {
      throw new ForbiddenException(
        'You do not have permission to view this region',
      );
    }

    return region;
  }

  // Cập nhật region
  async update(
    id: number,
    mangakaUserId: number,
    dto: UpdateRegionDto,
  ) {
    await this.findOne(id, mangakaUserId);

    return this.prisma.region.update({
      where: { id },
      data: {
        type: dto.regionType,
        xCoordinate: dto.x,
        yCoordinate: dto.y,
        width: dto.width,
        height: dto.height,
      },
    });
  }

  // Xóa region
  async remove(id: number, mangakaUserId: number) {
    await this.findOne(id, mangakaUserId);

    return this.prisma.region.delete({
      where: { id },
    });
  }
}
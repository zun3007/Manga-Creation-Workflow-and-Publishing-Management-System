import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: this.profileSelect(),
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateMyProfile(userId: number, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const displayName = dto.displayName?.trim();

    if (displayName) {
      await this.prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          displayName,
        },
      });
    }

    if (user.role === UserRole.MANGAKA) {
      await this.prisma.mangakaProfile.upsert({
        where: {
          userId,
        },
        create: {
          userId,
          penName: dto.penName?.trim() || displayName || user.displayName,
          biography: dto.biography?.trim() || null,
          yearsExperience: dto.yearsExperience ?? 0,
          studioName: dto.studioName?.trim() || null,
        },
        update: {
          ...(dto.penName !== undefined
            ? { penName: dto.penName.trim() || user.displayName }
            : {}),
          ...(dto.biography !== undefined
            ? { biography: dto.biography.trim() || null }
            : {}),
          ...(dto.yearsExperience !== undefined
            ? { yearsExperience: dto.yearsExperience }
            : {}),
          ...(dto.studioName !== undefined
            ? { studioName: dto.studioName.trim() || null }
            : {}),
        },
      });
    }

    if (user.role === UserRole.ASSISTANT) {
      await this.prisma.assistantProfile.upsert({
        where: {
          userId,
        },
        create: {
          userId,
          skillSet: dto.skillSet?.trim() || null,
        },
        update: {
          ...(dto.skillSet !== undefined
            ? { skillSet: dto.skillSet.trim() || null }
            : {}),
        },
      });
    }

    if (user.role === UserRole.TANTOU_EDITOR) {
      await this.prisma.tantouEditorProfile.upsert({
        where: {
          userId,
        },
        create: {
          userId,
          departmentName: dto.departmentName?.trim() || null,
          specialization: dto.specialization?.trim() || null,
          yearsExperience: dto.yearsExperience ?? 0,
        },
        update: {
          ...(dto.departmentName !== undefined
            ? { departmentName: dto.departmentName.trim() || null }
            : {}),
          ...(dto.specialization !== undefined
            ? { specialization: dto.specialization.trim() || null }
            : {}),
          ...(dto.yearsExperience !== undefined
            ? { yearsExperience: dto.yearsExperience }
            : {}),
        },
      });
    }

    if (user.role === UserRole.EDITORIAL_BOARD) {
      await this.prisma.editorialBoardProfile.upsert({
        where: {
          userId,
        },
        create: {
          userId,
          departmentName: dto.departmentName?.trim() || null,
          specialization: dto.specialization?.trim() || null,
          yearsExperience: dto.yearsExperience ?? 0,
        },
        update: {
          ...(dto.departmentName !== undefined
            ? { departmentName: dto.departmentName.trim() || null }
            : {}),
          ...(dto.specialization !== undefined
            ? { specialization: dto.specialization.trim() || null }
            : {}),
          ...(dto.yearsExperience !== undefined
            ? { yearsExperience: dto.yearsExperience }
            : {}),
        },
      });
    }

    return this.getMyProfile(userId);
  }

  async updateAvatar(userId: number, avatarUrl: string) {
    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        avatarUrl,
      },
    });

    return this.getMyProfile(userId);
  }

  private profileSelect() {
    return {
      id: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      googleSubject: true,
      emailVerifiedAt: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      mangakaProfile: true,
      assistantProfile: true,
      tantouEditorProfile: true,
      editorialBoardProfile: true,
    };
  }
}

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hash } from 'bcryptjs';
import { UserRole } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateUserByAdminDto } from './dto/create-user-by-admin.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();

    const existingUser = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const passwordHash = await hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName: dto.displayName,
        role: dto.role,
        isActive: true,
        mustChangePassword: true,
      },
      select: this.safeUserSelect(),
    });
  }

  async createByAdmin(dto: CreateUserByAdminDto) {
    const email = dto.email.trim().toLowerCase();

    const existingUser = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const passwordHash = await hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName: dto.displayName,
        role: dto.role,
        isActive: true,
        mustChangePassword: true,
      },
      select: this.safeUserSelect(),
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: this.safeUserSelect(),
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },
      select: this.safeUserSelect(),
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmailForAuth(email: string) {
    return this.prisma.user.findUnique({
      where: {
        email: email.trim().toLowerCase(),
      },
    });
  }

  async updateRole(id: number, role: UserRole) {
    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: {
        id,
      },
      data: {
        role,
      },
      select: this.safeUserSelect(),
    });
  }

  private safeUserSelect() {
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
    };
  }
}

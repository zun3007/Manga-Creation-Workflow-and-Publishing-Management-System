import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  getApiHealth() {
    return {
      status: 'ok',
      service: 'manga-workflow-api',
    };
  }

  @Get('database')
  async getDatabaseHealth() {
    const userCount = await this.prisma.user.count();

    return {
      status: 'ok',
      database: 'connected',
      userCount,
    };
  }
}

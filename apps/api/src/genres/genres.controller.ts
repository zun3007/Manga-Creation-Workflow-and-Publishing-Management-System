import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GenresService } from './genres.service';

@Controller('genres')
@UseGuards(JwtAuthGuard)
export class GenresController {
  constructor(private readonly service: GenresService) {}

  @Get()
  async getAll() {
    return this.service.getAll();
  }
}

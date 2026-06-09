import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StorageService } from '../s3/storage.service';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly storage: StorageService) {}

  // Upload a file into S3-compatible storage; returns a stable /uploads/<key> URL
  // (served by the public GET handler wired in main.ts). 30MB cap.
  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 30 * 1024 * 1024 },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Thiếu file để tải lên.');
    const key = `${randomUUID()}${extname(file.originalname)}`;
    await this.storage.put(key, file.buffer, file.mimetype);
    return { url: `/uploads/${key}`, originalName: file.originalname };
  }
}

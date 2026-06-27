import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Patch,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../generated/prisma/client';
import { StudioAssetsService } from './studio-assets.service';

const uploadPath = join(process.cwd(), 'uploads', 'assets');
mkdirSync(uploadPath, { recursive: true });

@Controller('studio-assets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MANGAKA)
export class StudioAssetsController {
  constructor(private readonly studioAssetsService: StudioAssetsService) {}

  @Get('my')
  findMyAssets(@Req() request: any) {
    return this.studioAssetsService.findMyAssets(request.user.sub);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: uploadPath,
        filename: (_request, file, callback) => {
          const uniqueName = `${Date.now()}-${Math.round(
            Math.random() * 1_000_000_000,
          )}${extname(file.originalname)}`;

          callback(null, uniqueName);
        },
      }),
      limits: {
        fileSize: 20 * 1024 * 1024,
      },
    }),
  )
  createAsset(
    @Req() request: any,
    @UploadedFile() file: any,
    @Body('assetType') assetType: string,
  ) {
    return this.studioAssetsService.createAsset(
      request.user.sub,
      file,
      assetType,
    );
  }

  @Patch(':assetId')
  updateAsset(
    @Req() request: any,
    @Param('assetId', ParseIntPipe) assetId: number,
    @Body()
    body: {
      originalName?: string;
      assetType?: string;
    },
  ) {
    return this.studioAssetsService.updateAsset(
      request.user.sub,
      assetId,
      body,
    );
  }

  @Delete(':assetId')
  removeAsset(
    @Req() request: any,
    @Param('assetId', ParseIntPipe) assetId: number,
  ) {
    return this.studioAssetsService.removeAsset(request.user.sub, assetId);
  }
}

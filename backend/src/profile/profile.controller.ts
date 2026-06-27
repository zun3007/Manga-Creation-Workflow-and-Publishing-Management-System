import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { mkdirSync } from 'fs';
import { Request } from 'express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileService } from './profile.service';

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

const avatarUploadPath = join(process.cwd(), 'uploads', 'avatars');
mkdirSync(avatarUploadPath, { recursive: true });

@ApiTags('Profile')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('me')
  getMyProfile(@Req() request: RequestWithUser) {
    return this.profileService.getMyProfile(request.user.sub);
  }

  @Patch('me')
  updateMyProfile(
    @Req() request: RequestWithUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profileService.updateMyProfile(request.user.sub, dto);
  }

  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: avatarUploadPath,
        filename: (_request, file, callback) => {
          const safeExtension = extname(file.originalname) || '.png';
          const fileName = `avatar-${Date.now()}-${Math.round(
            Math.random() * 1000000,
          )}${safeExtension}`;

          callback(null, fileName);
        },
      }),
      fileFilter: (_request, file, callback) => {
        if (!file.mimetype.startsWith('image/')) {
          callback(new Error('Only image files are allowed'), false);
          return;
        }

        callback(null, true);
      },
      limits: {
        fileSize: 2 * 1024 * 1024,
      },
    }),
  )
  uploadAvatar(
    @Req() request: RequestWithUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Avatar file is required');
    }

    const avatarUrl = `/uploads/avatars/${file.filename}`;

    return this.profileService.updateAvatar(request.user.sub, avatarUrl);
  }
}

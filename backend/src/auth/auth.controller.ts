import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleRequestOtpDto } from './dto/google-request-otp.dto';
import { GoogleVerifyOtpDto } from './dto/google-verify-otp.dto';

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Login bằng tài khoản nội bộ
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // Lấy thông tin user hiện tại
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() request: RequestWithUser) {
    return request.user;
  }

  // Đổi mật khẩu
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(
    @Req() request: RequestWithUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      request.user.sub,
      dto,
    );
  }

  // Google login: gửi OTP
@Post('google/request-otp')
requestGoogleOtp(@Body() dto: GoogleRequestOtpDto) {
  return this.authService.requestGoogleOtp(dto);
}

// Google login: xác thực OTP
@Post('google/verify-otp')
verifyGoogleOtp(@Body() dto: GoogleVerifyOtpDto) {
  return this.authService.verifyGoogleOtp(dto);
}
}
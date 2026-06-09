import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { GoogleOauthGuard } from './google-oauth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  // 20/min per IP — blocks brute-force while tolerating shared NAT, demos, and smoke runs.
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.validateLocal(dto.email, dto.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: any) {
    return req.user;
  }

  @Post('logout')
  logout() {
    // JWT is stateless; the client drops the token. Endpoint kept for symmetry.
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('password')
  changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(req.user.id, dto.currentPassword, dto.newPassword);
  }

  @UseGuards(GoogleOauthGuard)
  @Get('google')
  google() {
    // Redirects to Google (handled by the guard / passport).
  }

  @UseGuards(GoogleOauthGuard)
  @Get('google/callback')
  async googleCallback(@Req() req: any, @Res() res: Response) {
    const { accessToken } = await this.auth.validateGoogle(req.user);
    const client = this.config.get<string>('CLIENT_URL', 'http://localhost:5173');
    res.redirect(`${client}/auth/callback?token=${accessToken}`);
  }
}

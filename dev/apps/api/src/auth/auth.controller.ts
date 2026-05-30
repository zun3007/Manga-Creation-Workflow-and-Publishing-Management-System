import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { GoogleOauthGuard } from './google-oauth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

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

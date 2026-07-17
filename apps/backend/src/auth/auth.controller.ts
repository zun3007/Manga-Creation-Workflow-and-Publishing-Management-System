import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CompleteInitialPasswordDto } from './dto/complete-initial-password.dto';
import { Verify2faDto } from './dto/verify-2fa.dto';
import { Resend2faDto } from './dto/resend-2fa.dto';
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

  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('password/initial')
  completeInitialPassword(@Body() dto: CompleteInitialPasswordDto) {
    return this.auth.completeInitialPasswordChange(
      dto.challengeToken,
      dto.newPassword,
    );
  }

  // Exchange the OTP for an access token. Tighter limit than login: this is the
  // brute-force surface for the 6-digit code (per-code attempts are also capped at 5).
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('2fa/verify')
  verifyTwoFactor(@Body() dto: Verify2faDto) {
    return this.auth.verifyTwoFactor(dto.challengeToken, dto.code);
  }

  // Re-send the OTP. 60s cooldown + max-codes enforced in OtpService; this caps abuse.
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('2fa/resend')
  resendOtp(@Body() dto: Resend2faDto) {
    return this.auth.resendOtp(dto.challengeToken);
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
    return this.auth.changePassword(
      req.user.id,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @UseGuards(GoogleOauthGuard)
  @Get('google')
  google() {
    // Redirects to Google (handled by the guard / passport).
  }

  @UseGuards(GoogleOauthGuard)
  @Get('google/callback')
  async googleCallback(@Req() req: any, @Res() res: Response) {
    const client = this.config.get<string>(
      'CLIENT_URL',
      'http://localhost:5173',
    );
    try {
      const { accessToken } = await this.auth.validateGoogle(req.user);
      res.redirect(`${client}/auth/callback?token=${accessToken}`);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        res.redirect(`${client}/login?error=google_access_denied`);
        return;
      }
      throw error;
    }
  }
}

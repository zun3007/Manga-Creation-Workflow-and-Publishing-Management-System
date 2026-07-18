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
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CompleteInitialPasswordDto } from './dto/complete-initial-password.dto';
import { Verify2faDto } from './dto/verify-2fa.dto';
import { Resend2faDto } from './dto/resend-2fa.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { GoogleOauthGuard } from './google-oauth.guard';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyPasswordResetOtpDto } from './dto/verify-password-reset-otp.dto';
import { ResendPasswordResetOtpDto } from './dto/resend-password-reset-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  private static readonly TRUSTED_BROWSER_COOKIE = 'manga_trusted_browser';

  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  // 20/min per IP — blocks brute-force while tolerating shared NAT, demos, and smoke runs.
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.validateLocal(
      dto.email,
      dto.password,
      this.readCookie(req, AuthController.TRUSTED_BROWSER_COOKIE),
    );
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
  async verifyTwoFactor(
    @Body() dto: Verify2faDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.verifyTwoFactor(
      dto.challengeToken,
      dto.code,
    );
    const trustedBrowserToken = await this.auth.createTrustedBrowserToken(
      result.user.id,
    );

    res.cookie(
      AuthController.TRUSTED_BROWSER_COOKIE,
      trustedBrowserToken,
      {
        httpOnly: true,
        secure: this.config.get<string>('NODE_ENV') === 'production',
        sameSite: 'lax',
        path: '/api/auth',
        maxAge: this.auth.trustedBrowserTtlDays * 24 * 60 * 60 * 1000,
      },
    );
    return result;
  }

  // Re-send the OTP. 60s cooldown + max-codes enforced in OtpService; this caps abuse.
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('2fa/resend')
  resendOtp(@Body() dto: Resend2faDto) {
    return this.auth.resendOtp(dto.challengeToken);
  }

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('password/forgot')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.beginForgotPassword(dto.email);
  }

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('password/forgot/resend')
  resendPasswordResetOtp(@Body() dto: ResendPasswordResetOtpDto) {
    return this.auth.resendPasswordResetOtp(dto.challengeToken);
  }

  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('password/forgot/verify')
  verifyPasswordResetOtp(@Body() dto: VerifyPasswordResetOtpDto) {
    return this.auth.verifyPasswordResetOtp(dto.challengeToken, dto.code);
  }

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('password/reset')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.resetToken, dto.newPassword);
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

  private readCookie(req: Request, name: string): string | undefined {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return undefined;

    for (const part of cookieHeader.split(';')) {
      const separator = part.indexOf('=');
      if (separator < 0) continue;
      const key = part.slice(0, separator).trim();
      if (key !== name) continue;
      const value = part.slice(separator + 1).trim();
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
    return undefined;
  }
}

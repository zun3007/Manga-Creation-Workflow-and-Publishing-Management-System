import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthUser, JwtPayload } from '@manga/shared';
import { UsersService, UserRow } from '../users/users.service';
import { GoogleUser } from './google.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async validateLocal(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    if (!user || !user.password_hash) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }
    return this.issue(user);
  }

  async validateGoogle(profile: GoogleUser) {
    if (!profile.email) {
      throw new UnauthorizedException('Google account has no email');
    }
    let user = await this.users.findByEmail(profile.email);
    if (user) {
      if (!user.google_id) {
        await this.users.linkGoogle(user.user_id, profile.googleId);
      }
    } else {
      user = await this.users.createGoogleUser(
        profile.email,
        profile.name,
        profile.avatar,
        profile.googleId,
      );
    }
    return this.issue(user);
  }

  private issue(user: UserRow) {
    const payload: JwtPayload = {
      sub: user.user_id,
      email: user.email,
      role: user.role,
      name: user.full_name,
    };
    return {
      accessToken: this.jwt.sign(payload),
      user: this.publicUser(user),
    };
  }

  private publicUser(user: UserRow): AuthUser {
    return {
      id: user.user_id,
      email: user.email,
      name: user.full_name,
      role: user.role,
      avatarUrl: user.avatar_url,
    };
  }
}

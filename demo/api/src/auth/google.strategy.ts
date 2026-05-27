import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';

export interface GoogleUser {
  googleId: string;
  email: string;
  name: string;
  avatar: string | null;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    // Placeholder values keep construction from throwing when OAuth isn't configured yet.
    // GoogleOauthGuard blocks the route until real credentials are present.
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID') || 'GOOGLE_NOT_CONFIGURED',
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET') || 'GOOGLE_NOT_CONFIGURED',
      callbackURL:
        config.get<string>('GOOGLE_CALLBACK_URL') ||
        'http://localhost:3000/api/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const user: GoogleUser = {
      googleId: profile.id,
      email: profile.emails?.[0]?.value ?? '',
      name: profile.displayName || profile.name?.givenName || 'Google User',
      avatar: profile.photos?.[0]?.value ?? null,
    };
    done(null, user);
  }
}

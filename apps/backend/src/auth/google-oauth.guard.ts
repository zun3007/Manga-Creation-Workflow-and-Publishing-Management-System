import { ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';

/**
 * Wraps the Google passport guard. If OAuth credentials are not configured,
 * redirect back to the client login with an error instead of crashing or
 * bouncing to Google with an invalid client id.
 */
@Injectable()
export class GoogleOauthGuard extends AuthGuard('google') {
  constructor(private readonly config: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    const isMissingCredential = [clientId, clientSecret].some(
      (value) =>
        !value ||
        ['changeme', 'GOOGLE_NOT_CONFIGURED'].includes(value.trim()),
    );
    if (isMissingCredential) {
      const res = context.switchToHttp().getResponse();
      const client = this.config.get<string>('CLIENT_URL', 'http://localhost:5173');
      res.redirect(`${client}/login?error=google_not_configured`);
      return false;
    }
    return super.canActivate(context) as any;
  }
}

import { Role } from "../enums/role";

export interface LoginDto { email: string; password: string; }

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: Role;
  avatarUrl: string | null;
}

/** Shape of the signed JWT payload. */
export interface JwtPayload { sub: number; email: string; name: string; role: Role; }

/** Successful login — the access token + the public user. */
export interface AuthSuccess {
  accessToken: string;
  user: AuthUser;
}

/**
 * Returned by POST /auth/login when the account must clear an email OTP challenge
 * before an access token is issued.
 */
export interface TwoFactorRequired {
  twoFactorRequired: true;
  /** Short-lived signed token that ties the pending login to a user. */
  challengeToken: string;
  /** Masked destination, safe to show in the UI, e.g. "d•••@gmail.com". */
  emailMasked: string;
  /** Seconds until the challenge + code expire. */
  expiresIn: number;
  /** DEV ONLY: the OTP, echoed when OTP_DEV_ECHO=true and NODE_ENV!=='production'. */
  devCode?: string;
}

/** POST /auth/login returns one of these. */
export type LoginResponse = AuthSuccess | TwoFactorRequired;

/** Type guard for the 2FA branch of a login response. */
export function isTwoFactorRequired(
  res: LoginResponse,
): res is TwoFactorRequired {
  return (res as TwoFactorRequired).twoFactorRequired === true;
}

export interface Verify2faRequest { challengeToken: string; code: string; }
export interface Resend2faRequest { challengeToken: string; }
export interface ResendResult { ok: true; cooldownSeconds: number; devCode?: string; }

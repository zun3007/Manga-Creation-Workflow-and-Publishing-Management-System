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

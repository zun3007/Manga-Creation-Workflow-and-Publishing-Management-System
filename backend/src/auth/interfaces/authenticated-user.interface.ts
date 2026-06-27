import { UserRole } from '../../generated/prisma/client';

export interface AuthenticatedUser {
  sub: number;
  email: string;
  displayName: string;
  role: UserRole;
}

import { UserRole } from '../../generated/prisma/client';

export class CreateUserByAdminDto {
  email!: string;

  displayName!: string;

  role!: UserRole;

  password!: string;
}
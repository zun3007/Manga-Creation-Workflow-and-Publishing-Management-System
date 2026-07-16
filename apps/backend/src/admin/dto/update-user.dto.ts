import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { Role } from '@manga/shared';

export const ADMIN_UPDATEABLE_ROLES = [
  Role.MANGAKA,
  Role.ASSISTANT,
  Role.TANTOU_EDITOR,
  Role.EDITORIAL_BOARD,
] as const;

export class UpdateUserDto {
  @IsOptional()
  @IsBoolean()
  isActivated?: boolean;

  @IsOptional()
  @IsIn(ADMIN_UPDATEABLE_ROLES)
  role?: Role;
}

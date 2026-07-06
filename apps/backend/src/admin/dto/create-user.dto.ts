import { IsEmail, IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { Role } from '@manga/shared';

export const ADMIN_CREATABLE_ROLES = [
  Role.MANGAKA,
  Role.ASSISTANT,
  Role.TANTOU_EDITOR,
  Role.EDITORIAL_BOARD,
] as const;

export class CreateUserDto {
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName!: string;

  @IsIn(ADMIN_CREATABLE_ROLES)
  role!: Role;
}

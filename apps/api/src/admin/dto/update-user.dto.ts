import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { Role } from '@manga/shared';

export class UpdateUserDto {
  @IsOptional()
  @IsBoolean()
  isActivated?: boolean;

  @IsOptional()
  @IsIn(Object.values(Role))
  role?: Role;
}

import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  penName?: string;

  @IsOptional()
  @IsString()
  biography?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  yearsExperience?: number;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  studioName?: string;

  @IsOptional()
  @IsString()
  skillSet?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  departmentName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  specialization?: string;
}

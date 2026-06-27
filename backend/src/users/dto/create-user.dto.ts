import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../generated/prisma/client';

export class CreateUserDto {
  @ApiProperty({
    example: 'assistant@mangaflow.local',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '123456',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    example: 'Assistant Demo',
  })
  @IsString()
  @IsNotEmpty()
  displayName: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.ASSISTANT,
  })
  @IsEnum(UserRole)
  role: UserRole;
}

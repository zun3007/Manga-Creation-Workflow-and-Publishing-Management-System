import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'admin@mangaflow.local',
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
}

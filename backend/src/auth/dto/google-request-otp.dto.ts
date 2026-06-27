import { IsString, MinLength } from 'class-validator';

export class GoogleRequestOtpDto {
  @IsString()
  @MinLength(10)
  credential: string;
}
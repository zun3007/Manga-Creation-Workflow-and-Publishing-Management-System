import { IsString } from 'class-validator';

export class ResendPasswordResetOtpDto {
  @IsString()
  challengeToken!: string;
}

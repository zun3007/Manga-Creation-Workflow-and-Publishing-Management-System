import { IsString } from 'class-validator';

export class Resend2faDto {
  @IsString()
  challengeToken: string;
}

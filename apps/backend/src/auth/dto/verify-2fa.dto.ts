import { IsString, Matches } from 'class-validator';

export class Verify2faDto {
  @IsString()
  challengeToken: string;

  @Matches(/^\d{6}$/, { message: 'Mã xác thực gồm 6 chữ số' })
  code: string;
}

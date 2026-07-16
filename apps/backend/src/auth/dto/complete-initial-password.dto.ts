import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CompleteInitialPasswordDto {
  @IsString()
  @IsNotEmpty()
  challengeToken!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword!: string;
}

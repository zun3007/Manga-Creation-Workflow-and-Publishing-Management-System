import {
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreatePageVersionDto {
  @IsString()
  @MinLength(1)
  imageUrl: string;

  @IsOptional()
  @IsString()
  uploadNote?: string;
}
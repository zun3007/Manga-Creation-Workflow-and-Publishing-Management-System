import {
  IsString,
  IsInt,
  IsOptional,
  IsNotEmpty,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePageDto {
  @IsInt()
  @Min(1)
  chapterId!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  imageUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  uploadNote?: string;
}

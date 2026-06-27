import {
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePageDto {
  @IsInt()
  @Min(1)
  chapterId: number;

  @IsInt()
  @Min(1)
  pageNumber: number;

  // Đường dẫn ảnh version đầu tiên
  @IsString()
  @MinLength(1)
  imageUrl: string;

  @IsOptional()
  @IsString()
  uploadNote?: string;
}
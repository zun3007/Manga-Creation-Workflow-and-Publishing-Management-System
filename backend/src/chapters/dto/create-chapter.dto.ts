import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateChapterDto {
  @IsInt()
  @Min(1)
  seriesId: number;

  @IsInt()
  @Min(1)
  chapterNumber: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;
}
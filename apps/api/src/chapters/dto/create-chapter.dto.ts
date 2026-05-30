import { IsString, IsInt, IsOptional, IsDateString } from 'class-validator';

export class CreateChapterDto {
  @IsInt()
  seriesId!: number;

  @IsString()
  title!: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;
}

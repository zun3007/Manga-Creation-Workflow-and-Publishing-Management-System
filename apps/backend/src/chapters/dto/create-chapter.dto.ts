import { IsString, IsInt, IsOptional, IsDateString, IsNotEmpty, MaxLength, Min } from 'class-validator';

export class CreateChapterDto {
  @IsInt()
  @Min(1)
  seriesId!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;
}

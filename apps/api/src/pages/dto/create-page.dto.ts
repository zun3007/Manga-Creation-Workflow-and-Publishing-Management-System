import { IsString, IsInt, IsOptional } from 'class-validator';

export class CreatePageDto {
  @IsInt()
  chapterId!: number;

  @IsString()
  imageUrl!: string;

  @IsOptional()
  @IsString()
  uploadNote?: string;
}

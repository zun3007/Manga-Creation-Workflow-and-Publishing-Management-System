import { IsInt, IsString, IsOptional } from 'class-validator';

export class SavePageVersionDto {
  @IsInt()
  pageId!: number;

  @IsString()
  imageUrl!: string;

  @IsOptional()
  @IsString()
  note?: string;
}

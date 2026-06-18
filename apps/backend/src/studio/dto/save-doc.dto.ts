import { IsInt, IsObject } from 'class-validator';

export class SaveDocDto {
  @IsInt()
  pageId!: number;

  @IsObject()
  manifest!: Record<string, unknown>;
}

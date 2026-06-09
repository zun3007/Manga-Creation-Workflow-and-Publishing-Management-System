import { IsEnum, IsNotEmpty } from 'class-validator';
import { ChapterStatus } from '@manga/shared';

export class ChapterStatusDto {
  @IsEnum(ChapterStatus)
  @IsNotEmpty()
  status!: ChapterStatus;
}

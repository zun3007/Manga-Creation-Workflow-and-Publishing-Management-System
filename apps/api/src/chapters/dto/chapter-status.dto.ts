import { IsEnum } from 'class-validator';
import { ChapterStatus } from '@manga/shared';

export class ChapterStatusDto {
  @IsEnum(ChapterStatus)
  status!: ChapterStatus;
}

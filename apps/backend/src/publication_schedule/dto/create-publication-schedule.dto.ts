import { IsDateString, IsInt } from 'class-validator';

export class CreatePublicationScheduleDto {
  @IsInt()
  chapterId: number;

  @IsDateString()
  releaseDate: string;
}

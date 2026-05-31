import { IsInt, IsIn, IsDateString } from 'class-validator';

export class CreateVotePeriodDto {
  @IsInt()
  seriesId: number;

  @IsIn(['WEEKLY', 'MONTHLY'])
  periodType: 'WEEKLY' | 'MONTHLY';

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}

import { IsInt, IsIn, IsDateString, IsNotEmpty, Min } from 'class-validator';

export class CreateVotePeriodDto {
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  seriesId: number;

  @IsIn(['WEEKLY', 'MONTHLY'])
  @IsNotEmpty()
  periodType: 'WEEKLY' | 'MONTHLY';

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;
}

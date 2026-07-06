import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class ImportReaderVotesDto {
  @IsIn(['WEEKLY', 'MONTHLY'])
  @IsNotEmpty()
  periodType: 'WEEKLY' | 'MONTHLY';

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200000)
  csv: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  fileName?: string;
}

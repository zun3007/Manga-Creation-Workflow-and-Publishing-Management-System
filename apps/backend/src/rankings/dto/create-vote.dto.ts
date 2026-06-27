import {
  IsInt,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsString,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';

export class CreateVoteDto {
  @IsInt()
  @IsNotEmpty()
  votePeriodId: number;

  @IsNumber()
  @Min(1)
  @Max(5)
  @IsNotEmpty()
  score: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  comment?: string;
}

import { IsInt, IsNumber, Min, Max, IsOptional, IsString } from 'class-validator';

export class CreateVoteDto {
  @IsInt()
  votePeriodId: number;

  @IsNumber()
  @Min(1)
  @Max(5)
  score: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

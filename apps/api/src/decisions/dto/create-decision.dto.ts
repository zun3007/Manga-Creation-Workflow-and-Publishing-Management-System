import { IsInt, IsEnum, IsOptional, IsString, IsNotEmpty } from 'class-validator';
import { DecisionType, Frequency } from '@manga/shared';

export class CreateDecisionDto {
  @IsInt()
  seriesId: number;

  @IsEnum(DecisionType)
  decisionType: DecisionType;

  @IsOptional()
  @IsEnum(Frequency)
  newFrequency?: Frequency;

  @IsString()
  @IsNotEmpty()
  reason: string;
}

import {
  IsInt,
  IsEnum,
  IsOptional,
  IsString,
  IsNotEmpty,
  MaxLength,
  Min,
} from 'class-validator';
import { DecisionType, Frequency } from '@manga/shared';

export class CreateDecisionDto {
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  seriesId: number;

  @IsEnum(DecisionType)
  @IsNotEmpty()
  decisionType: DecisionType;

  @IsOptional()
  @IsEnum(Frequency)
  newFrequency?: Frequency;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  reason: string;
}

import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsInt,
  ArrayNotEmpty,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { Frequency } from '@manga/shared';

export class CreateProposalDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  synopsis?: string;

  @IsEnum(Frequency)
  proposedFrequency!: Frequency;

  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  genreIds!: number[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  sampleManuscriptUrl?: string;
}

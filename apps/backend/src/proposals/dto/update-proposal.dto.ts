import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsInt,
  ArrayNotEmpty,
  MaxLength,
} from 'class-validator';
import { Frequency } from '@manga/shared';

/** Partial update of a DRAFT proposal (S1-F07). All fields optional. */
export class UpdateProposalDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  synopsis?: string;

  @IsOptional()
  @IsEnum(Frequency)
  proposedFrequency?: Frequency;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  genreIds?: number[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  sampleManuscriptUrl?: string;
}

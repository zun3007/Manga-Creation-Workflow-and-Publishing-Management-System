import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { PublicationFrequency } from '../../generated/prisma/client';

export class CreateSeriesProposalDto {
  @IsString()
  @MinLength(3)
  title: string;

  @IsString()
  @MinLength(10)
  synopsis: string;

  @IsEnum(PublicationFrequency)
  proposedFrequency: PublicationFrequency;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  genreIds?: number[];
}
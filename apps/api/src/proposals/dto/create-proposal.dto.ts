import { IsString, IsOptional, IsEnum, IsArray, IsInt, ArrayNotEmpty } from 'class-validator';
import { Frequency } from '@manga/shared';

export class CreateProposalDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  synopsis?: string;

  @IsEnum(Frequency)
  proposedFrequency!: Frequency;

  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  genreIds!: number[];
}

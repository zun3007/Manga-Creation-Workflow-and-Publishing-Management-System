import {
  IsIn,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  MaxLength,
  Min,
} from 'class-validator';

export class ResolveDisputeDto {
  @IsIn(['RESOLVED', 'REJECTED'])
  @IsNotEmpty()
  status!: 'RESOLVED' | 'REJECTED';

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  resolutionNote!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  adjustedAmount?: number;
}

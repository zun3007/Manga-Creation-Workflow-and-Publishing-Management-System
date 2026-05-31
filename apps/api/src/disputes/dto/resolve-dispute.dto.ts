import { IsIn, IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class ResolveDisputeDto {
  @IsIn(['RESOLVED', 'REJECTED'])
  status!: 'RESOLVED' | 'REJECTED';

  @IsString()
  @IsNotEmpty()
  resolutionNote!: string;

  @IsOptional()
  @IsNumber()
  adjustedAmount?: number;
}

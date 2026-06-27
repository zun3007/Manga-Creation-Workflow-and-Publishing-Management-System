import {
  IsInt,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateDisputeDto {
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  taskId!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  reason!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  expectedAmount?: number;
}

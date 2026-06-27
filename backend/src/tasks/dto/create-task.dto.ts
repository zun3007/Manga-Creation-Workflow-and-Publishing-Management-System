import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateTaskDto {
  @IsInt()
  @Min(1)
  regionId: number;

  @IsInt()
  @Min(1)
  assigneeUserId: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  taskPriceRuleId?: number;

  @IsString()
  @MinLength(3)
  description: string;

  @IsOptional()
  @IsString()
  instruction?: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  paymentAmount?: number;
}
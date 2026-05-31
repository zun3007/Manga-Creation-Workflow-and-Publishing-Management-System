import { IsInt, IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateDisputeDto {
  @IsInt()
  taskId!: number;

  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsOptional()
  @IsNumber()
  expectedAmount?: number;
}

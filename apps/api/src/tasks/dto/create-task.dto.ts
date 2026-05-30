import { IsInt, IsOptional, IsString, IsDateString } from 'class-validator';

export class CreateTaskDto {
  @IsInt()
  regionId!: number;

  @IsInt()
  assigneeUserId!: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  instruction?: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;
}

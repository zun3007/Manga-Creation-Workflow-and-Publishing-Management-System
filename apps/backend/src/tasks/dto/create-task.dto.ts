import {
  IsInt,
  IsOptional,
  IsString,
  IsDateString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTaskDto {
  @IsInt()
  @Min(1)
  regionId!: number;

  @IsInt()
  @Min(1)
  assigneeUserId!: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  instruction?: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;
}

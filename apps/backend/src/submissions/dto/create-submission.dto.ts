import {
  IsInt,
  IsOptional,
  IsString,
  IsNotEmpty,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateSubmissionDto {
  @IsInt()
  @Min(1)
  taskId!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  fileUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  versionNote?: string;
}

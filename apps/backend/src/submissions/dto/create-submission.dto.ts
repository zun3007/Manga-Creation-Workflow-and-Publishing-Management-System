import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateSubmissionDto {
  @IsInt()
  @Min(1)
  taskId!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  versionNote?: string;
}

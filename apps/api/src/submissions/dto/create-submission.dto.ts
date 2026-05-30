import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateSubmissionDto {
  @IsInt()
  taskId!: number;

  @IsString()
  fileUrl!: string;

  @IsOptional()
  @IsString()
  versionNote?: string;
}

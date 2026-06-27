import {
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateSubmissionDto {
  @IsString()
  @MinLength(1)
  fileUrl: string;

  @IsOptional()
  @IsString()
  feedback?: string;
}
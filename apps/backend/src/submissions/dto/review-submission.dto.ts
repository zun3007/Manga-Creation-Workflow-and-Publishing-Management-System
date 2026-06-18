import { IsIn, IsOptional, IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class ReviewSubmissionDto {
  @IsIn(['APPROVED', 'REVISION_REQUIRED'])
  @IsNotEmpty()
  decision!: 'APPROVED' | 'REVISION_REQUIRED';

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  feedback?: string;
}

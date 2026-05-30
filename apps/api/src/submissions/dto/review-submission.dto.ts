import { IsIn, IsOptional, IsString } from 'class-validator';

export class ReviewSubmissionDto {
  @IsIn(['APPROVED', 'REVISION_REQUIRED'])
  decision!: 'APPROVED' | 'REVISION_REQUIRED';

  @IsOptional()
  @IsString()
  feedback?: string;
}

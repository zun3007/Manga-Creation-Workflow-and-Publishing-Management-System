import { IsIn, IsOptional, IsString } from 'class-validator';

export class EditorReviewDto {
  @IsIn(['APPROVE', 'REVISE'])
  decision!: 'APPROVE' | 'REVISE';

  @IsOptional()
  @IsString()
  feedback?: string;
}

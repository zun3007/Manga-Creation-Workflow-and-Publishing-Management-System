import { IsIn, IsOptional, IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class EditorReviewDto {
  @IsIn(['APPROVE', 'REVISE'])
  @IsNotEmpty()
  decision!: 'APPROVE' | 'REVISE';

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  feedback?: string;
}

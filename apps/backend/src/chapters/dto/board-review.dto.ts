import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class BoardReviewDto {
  @IsIn(['APPROVE', 'REJECT'])
  decision!: 'APPROVE' | 'REJECT';

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  feedback?: string;
}

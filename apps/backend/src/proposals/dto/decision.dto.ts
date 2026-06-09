import { IsIn, IsNotEmpty } from 'class-validator';

export class DecisionDto {
  @IsIn(['APPROVED', 'REJECTED'])
  @IsNotEmpty()
  decision!: 'APPROVED' | 'REJECTED';
}

import { IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateBoardVoteDto {
  @IsInt()
  proposalId!: number;

  @IsNumber()
  @Min(1)
  @Max(10)
  artQuality!: number;

  @IsNumber()
  @Min(1)
  @Max(10)
  storyClarity!: number;

  @IsNumber()
  @Min(1)
  @Max(10)
  marketPotential!: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

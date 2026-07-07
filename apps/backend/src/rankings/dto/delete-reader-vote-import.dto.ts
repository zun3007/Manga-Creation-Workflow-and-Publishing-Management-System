import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DeleteReaderVoteImportDto {
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  reason?: string;
}

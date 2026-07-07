import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateDefenseReportDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content!: string;
}

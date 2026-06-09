import { IsInt, IsEnum, IsNumber, IsNotEmpty, Min } from 'class-validator';
import { RegionType } from '@manga/shared';

export class CreateRegionDto {
  @IsInt()
  @Min(1)
  pageId!: number;

  @IsEnum(RegionType)
  @IsNotEmpty()
  regionType!: RegionType;

  @IsNumber()
  @IsNotEmpty()
  x!: number;

  @IsNumber()
  @IsNotEmpty()
  y!: number;

  @IsNumber()
  @IsNotEmpty()
  width!: number;

  @IsNumber()
  @IsNotEmpty()
  height!: number;
}

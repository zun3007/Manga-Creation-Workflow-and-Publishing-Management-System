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
  @Min(0)
  @IsNotEmpty()
  x!: number;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  y!: number;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  width!: number;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  height!: number;
}

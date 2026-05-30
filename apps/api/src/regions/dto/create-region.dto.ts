import { IsInt, IsEnum, IsNumber } from 'class-validator';
import { RegionType } from '@manga/shared';

export class CreateRegionDto {
  @IsInt()
  pageId!: number;

  @IsEnum(RegionType)
  regionType!: RegionType;

  @IsNumber()
  x!: number;

  @IsNumber()
  y!: number;

  @IsNumber()
  width!: number;

  @IsNumber()
  height!: number;
}

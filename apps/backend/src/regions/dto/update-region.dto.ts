import { IsEnum, IsNotEmpty } from 'class-validator';
import { RegionType } from '@manga/shared';

export class UpdateRegionDto {
  @IsEnum(RegionType)
  @IsNotEmpty()
  regionType!: RegionType;
}

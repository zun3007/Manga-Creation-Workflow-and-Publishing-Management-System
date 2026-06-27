import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { RegionType } from '../../generated/prisma/client';

export class CreateRegionDto {
  @IsNumber()
  @Min(1)
  pageId: number;

  @IsEnum(RegionType)
  regionType: RegionType;

  @IsNumber()
  @Min(0)
  x: number;

  @IsNumber()
  @Min(0)
  y: number;

  @IsNumber()
  @Min(1)
  width: number;

  @IsNumber()
  @Min(1)
  height: number;

  // DB hiện chưa có cột note, nên chỉ nhận tạm nhưng không lưu
  @IsOptional()
  @IsString()
  note?: string;
}
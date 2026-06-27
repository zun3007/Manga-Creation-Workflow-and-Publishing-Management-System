import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { RegionType } from '../../generated/prisma/client';

export class UpdateRegionDto {
  @IsOptional()
  @IsEnum(RegionType)
  regionType?: RegionType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  x?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  y?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  width?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  height?: number;

  // DB hiện chưa có cột note, nên chỉ nhận tạm nhưng không lưu
  @IsOptional()
  @IsString()
  note?: string;
}
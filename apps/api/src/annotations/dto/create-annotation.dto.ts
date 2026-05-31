import {
  IsEnum,
  IsInt,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
} from 'class-validator';
import {
  AnnotationTargetType,
  AnnotationCategory,
} from '@manga/shared';

export class CreateAnnotationDto {
  @IsEnum(AnnotationTargetType)
  targetType!: AnnotationTargetType;

  @IsInt()
  targetId!: number;

  @IsEnum(AnnotationCategory)
  category!: AnnotationCategory;

  @IsString()
  @IsNotEmpty()
  context!: string;

  @IsOptional()
  @IsNumber()
  x?: number;

  @IsOptional()
  @IsNumber()
  y?: number;
}

import {
  IsEnum,
  IsInt,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  MaxLength,
  Min,
} from 'class-validator';
import {
  AnnotationTargetType,
  AnnotationCategory,
} from '@manga/shared';

export class CreateAnnotationDto {
  @IsEnum(AnnotationTargetType)
  @IsNotEmpty()
  targetType!: AnnotationTargetType;

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  targetId!: number;

  @IsEnum(AnnotationCategory)
  @IsNotEmpty()
  category!: AnnotationCategory;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  context!: string;

  @IsOptional()
  @IsNumber()
  x?: number;

  @IsOptional()
  @IsNumber()
  y?: number;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BusinessType } from '@shu/shared-types';

export class QueryBusinessDto {
  @ApiPropertyOptional({ enum: BusinessType, description: 'تصفية حسب القسم' })
  @IsOptional()
  @IsEnum(BusinessType)
  type?: BusinessType;

  @ApiPropertyOptional({ description: 'تصفية حسب الوسم (معرّف الوسم)' })
  @IsOptional()
  @IsString()
  tagId?: string;

  @ApiPropertyOptional({ description: 'تصفية حسب المنطقة' })
  @IsOptional()
  @IsString()
  areaId?: string;

  @ApiPropertyOptional({ description: 'بحث بالاسم' })
  @IsOptional()
  @IsString()
  search?: string;
}

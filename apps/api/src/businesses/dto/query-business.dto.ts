import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BusinessCategory } from '@shu/shared-types';

export class QueryBusinessDto {
  @ApiPropertyOptional({ enum: BusinessCategory })
  @IsOptional()
  @IsEnum(BusinessCategory)
  category?: BusinessCategory;

  @ApiPropertyOptional({ description: 'تصفية حسب المنطقة' })
  @IsOptional()
  @IsString()
  areaId?: string;

  @ApiPropertyOptional({ description: 'بحث بالاسم' })
  @IsOptional()
  @IsString()
  search?: string;
}

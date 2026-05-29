import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/** فلترة قائمة السائقين (تُستخدم في شاشة اختيار السائق لدى المنشأة). */
export class QueryDriversDto {
  @ApiPropertyOptional({ description: 'تصفية حسب المنطقة' })
  @IsOptional()
  @IsString()
  areaId?: string;
}

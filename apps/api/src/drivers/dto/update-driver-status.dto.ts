import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DriverStatus } from '@shu/shared-types';

/** يستخدمها السائق لتبديل حالته (متاح / مشغول / غير متصل) وتغيير منطقته. */
export class UpdateDriverStatusDto {
  @ApiProperty({ enum: DriverStatus })
  @IsEnum(DriverStatus)
  status!: DriverStatus;

  @ApiPropertyOptional({ description: 'تغيير المنطقة الحالية (اختياري)' })
  @IsOptional()
  @IsString()
  areaId?: string;
}

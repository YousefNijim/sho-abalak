import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional } from 'class-validator';

export class UpdateSettingsDto {
  @ApiPropertyOptional({ description: 'نسبة عمولة المنصة الافتراضية' })
  @IsOptional()
  @IsNumber()
  defaultCommission?: number;

  @ApiPropertyOptional({ description: 'رسوم التوصيل الأساسية' })
  @IsOptional()
  @IsNumber()
  baseDeliveryFee?: number;

  @ApiPropertyOptional({ description: 'تفعيل تطبيق الزبائن' })
  @IsOptional()
  @IsBoolean()
  customerAppActive?: boolean;

  @ApiPropertyOptional({ description: 'تفعيل تطبيق المنشآت' })
  @IsOptional()
  @IsBoolean()
  businessAppActive?: boolean;

  @ApiPropertyOptional({ description: 'تفعيل تطبيق السائقين' })
  @IsOptional()
  @IsBoolean()
  driverAppActive?: boolean;
}

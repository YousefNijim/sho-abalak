import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { BusinessCategory, DeliveryType } from '@shu/shared-types';

export class CreateBusinessDto {
  @ApiProperty({ example: 'مطعم القدس' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ enum: BusinessCategory })
  @IsEnum(BusinessCategory)
  category!: BusinessCategory;

  @ApiProperty({ description: 'معرّف المنطقة' })
  @IsString()
  areaId!: string;

  @ApiPropertyOptional({ enum: DeliveryType, default: DeliveryType.PLATFORM })
  @IsOptional()
  @IsEnum(DeliveryType)
  deliveryType?: DeliveryType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'رقم هاتف المتجر' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'رابط شعار المتجر (logo)' })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'العنوان بالتفصيل' })
  @IsOptional()
  @IsString()
  addressDetail?: string;

  @ApiPropertyOptional({ description: 'وقت الفتح، مثل 09:00 ص' })
  @IsOptional()
  @IsString()
  openTime?: string;

  @ApiPropertyOptional({ description: 'وقت الإغلاق، مثل 11:00 م' })
  @IsOptional()
  @IsString()
  closeTime?: string;
}

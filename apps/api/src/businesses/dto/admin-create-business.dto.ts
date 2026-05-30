import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { BusinessCategory } from '@shu/shared-types';

/**
 * Admin creates a complete, immediately-active store.
 * Reuses the existing Business field names + sets the owner password.
 */
export class AdminCreateBusinessDto {
  @ApiProperty({ example: 'مطعم الزيتون الأصيل', description: 'اسم المتجر' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ enum: BusinessCategory })
  @IsEnum(BusinessCategory)
  category!: BusinessCategory;

  @ApiProperty({ example: 'أحمد محمد', description: 'اسم صاحب المتجر' })
  @IsString()
  @MinLength(2)
  ownerName!: string;

  @ApiProperty({ example: '0599123456', description: 'رقم هاتف فلسطيني' })
  @Matches(/^0(5[69])\d{7}$/, { message: 'رقم الهاتف غير صالح' })
  phone!: string;

  @ApiProperty({ description: 'معرّف المنطقة' })
  @IsString()
  areaId!: string;

  @ApiProperty({ description: 'كلمة مرور المتجر', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiPropertyOptional({ description: 'العنوان بالتفصيل' })
  @IsOptional()
  @IsString()
  addressDetail?: string;
}

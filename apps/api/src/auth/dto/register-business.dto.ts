import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { BusinessType } from '@shu/shared-types';

/**
 * Self-service store registration (business login screen).
 * Reuses the existing Business field names — no parallel fields.
 */
export class RegisterBusinessDto {
  @ApiProperty({ example: 'مطعم الزيتون الأصيل', description: 'اسم المتجر' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ enum: BusinessType, description: 'القسم: مأكولات أو متاجر' })
  @IsEnum(BusinessType)
  type!: BusinessType;

  @ApiPropertyOptional({ type: [String], description: 'معرّفات الوسوم' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];

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

  @ApiPropertyOptional({ description: 'العنوان بالتفصيل' })
  @IsOptional()
  @IsString()
  addressDetail?: string;
}

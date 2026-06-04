import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateAreaDto {
  @ApiProperty({ description: 'اسم المدينة (مثلاً: رام الله)' })
  @IsString()
  @IsNotEmpty()
  city!: string;

  @ApiProperty({ description: 'اسم المنطقة أو الحي' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'رسوم التوصيل الإجمالية (سائق + منصة)' })
  @IsNumber()
  deliveryFee!: number;

  @ApiPropertyOptional({ description: 'حصة السائق من رسوم التوصيل' })
  @IsOptional()
  @IsNumber()
  driverDeliveryFee?: number;
}

export class UpdateAreaDto {
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() deliveryFee?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() driverDeliveryFee?: number;
}

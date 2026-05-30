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

  @ApiProperty({ description: 'رسوم التوصيل لهذه المنطقة بالشيكل' })
  @IsNumber()
  deliveryFee!: number;
}

export class UpdateAreaDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  deliveryFee?: number;
}

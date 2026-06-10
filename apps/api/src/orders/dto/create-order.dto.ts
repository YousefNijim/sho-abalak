import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEnum, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { PaymentMethod } from '@shu/shared-types';

export class OrderItemDto {
  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ description: 'معرّف المتغير (للمتاجر ذات المتغيرات)' })
  @IsOptional()
  @IsString()
  variantId?: string;
}

export class CreateOrderDto {
  @ApiProperty()
  @IsString()
  businessId!: string;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional({ description: 'ملاحظة للمنشأة' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ description: 'اسم منطقة التوصيل — يُحفظ على الطلب كلقطة' })
  @IsOptional()
  @IsString()
  deliveryAreaName?: string;

  @ApiPropertyOptional({ description: 'تفاصيل عنوان التوصيل — يُحفظ على الطلب كلقطة' })
  @IsOptional()
  @IsString()
  deliveryAddressDetail?: string;

  @ApiPropertyOptional({ description: 'كود كوبون الخصم' })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional({ description: 'معرّف المنطقة للتوصيل' })
  @IsOptional()
  @IsString()
  areaId?: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty()
  @IsString()
  orderId!: string;

  @ApiProperty({ minimum: 1, maximum: 5, description: 'تقييم جودة المنتجات' })
  @IsInt()
  @Min(1)
  @Max(5)
  businessRating!: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 5, description: 'تقييم سرعة التوصيل' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  deliveryRating?: number;

  @ApiPropertyOptional({ description: 'تعليق اختياري' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}

export class CreateDriverReviewDto {
  @ApiProperty()
  @IsString()
  orderId!: string;

  @ApiProperty({ minimum: 1, maximum: 5, description: 'تقييم سرعة الاستجابة والتوصيل' })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;
}

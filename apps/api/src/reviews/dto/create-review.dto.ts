import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/** يقيّم الزبون طلبه بعد التسليم: تقييم المنشأة (إلزامي) وتقييم السائق (اختياري). */
export class CreateReviewDto {
  @ApiProperty()
  @IsString()
  orderId!: string;

  @ApiProperty({ minimum: 1, maximum: 5, description: 'تقييم المنشأة' })
  @IsInt()
  @Min(1)
  @Max(5)
  businessRating!: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 5, description: 'تقييم السائق' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  driverRating?: number;

  @ApiPropertyOptional({ description: 'تعليق' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}

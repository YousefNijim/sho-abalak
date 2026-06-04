import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateCouponDto {
  @IsString() code!: string;
  @IsEnum(['FIXED', 'PERCENTAGE']) discountType!: 'FIXED' | 'PERCENTAGE';
  @IsOptional() @IsNumber() @Min(0.01) discountAmount?: number;
  @IsOptional() @IsNumber() @Min(0.01) @Min(0) discountPct?: number;
  @IsOptional() @IsNumber() @Min(0) maxDiscount?: number;
  @IsNumber() @Min(0) minimumOrder!: number;
  @IsEnum(['PLATFORM', 'BUSINESS']) issuedBy!: 'PLATFORM' | 'BUSINESS';
}

export class UpdateCouponDto {
  @IsOptional() @IsNumber() @Min(0.01) discountAmount?: number;
  @IsOptional() @IsNumber() @Min(0.01) discountPct?: number;
  @IsOptional() @IsNumber() @Min(0) maxDiscount?: number;
  @IsOptional() @IsNumber() @Min(0) minimumOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class ApplyCouponDto {
  @IsString() code!: string;
  @IsNumber() @Min(0) cartSubtotal!: number;
}

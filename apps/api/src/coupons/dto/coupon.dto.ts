import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateCouponDto {
  @IsString() code!: string;
  @IsNumber() @Min(0.01) discountAmount!: number;
  @IsNumber() @Min(0) minimumOrder!: number;
}

export class UpdateCouponDto {
  @IsOptional() @IsNumber() @Min(0.01) discountAmount?: number;
  @IsOptional() @IsNumber() @Min(0) minimumOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class ApplyCouponDto {
  @IsString() code!: string;
  @IsNumber() @Min(0) cartSubtotal!: number;
}

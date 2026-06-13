import { IsEnum, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class ResolveEscalationDto {
  @IsEnum(['APPROVE', 'REJECT'])
  action!: 'APPROVE' | 'REJECT';

  /** رسوم التوصيل الجديدة (يجب توفيرها عند الموافقة) */
  @IsOptional()
  @IsNumber()
  @IsPositive()
  newDeliveryFee?: number;

  /**
   * صاحب التوصيل عند الموافقة:
   *   'PLATFORM' → سائق من المنصة  (deliveryMode = 'PLATFORM')
   *   'STORE'    → المتجر يوصّل بنفسه (deliveryMode = 'SELF')
   */
  @IsOptional()
  @IsEnum(['PLATFORM', 'STORE'])
  deliveryOwner?: 'PLATFORM' | 'STORE';

  /** حصة السائق/المتجر من رسوم التوصيل */
  @IsOptional()
  @IsNumber()
  newDriverFee?: number;

  /** حصة المنصة من رسوم التوصيل */
  @IsOptional()
  @IsNumber()
  newPlatformFee?: number;
}

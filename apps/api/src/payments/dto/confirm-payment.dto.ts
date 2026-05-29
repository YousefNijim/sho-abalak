import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

/**
 * Online payment confirmation. In production this is the gateway's webhook body
 * (the provider verifies its signature). `paid` lets the dev MockProvider exercise
 * both the success and FAILED paths.
 */
export class ConfirmPaymentDto {
  @ApiProperty({ description: 'مرجع الدفع من مزوّد الدفع' })
  @IsString()
  reference!: string;

  @ApiPropertyOptional({ description: 'نتيجة الدفع (للاختبار). الافتراضي: ناجح', default: true })
  @IsOptional()
  @IsBoolean()
  paid?: boolean;
}

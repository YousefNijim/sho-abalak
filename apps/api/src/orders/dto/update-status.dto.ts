import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '@shu/shared-types';

export class UpdateStatusDto {
  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  status!: OrderStatus;

  @ApiPropertyOptional({ description: 'معرّف السائق (عند التعيين)' })
  @IsOptional()
  @IsString()
  driverId?: string;
}

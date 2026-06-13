import { IsOptional, IsString } from 'class-validator';

export class EscalateOrderDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

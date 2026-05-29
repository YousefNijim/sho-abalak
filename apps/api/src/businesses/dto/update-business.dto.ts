import { PartialType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateBusinessDto } from './create-business.dto';

export class UpdateBusinessDto extends PartialType(CreateBusinessDto) {
  @ApiPropertyOptional({ description: 'مفتوح / مغلق' })
  @IsOptional()
  @IsBoolean()
  isOpen?: boolean;
}

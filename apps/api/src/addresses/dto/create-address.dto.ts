import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAddressDto {
  @ApiProperty({ example: 'المنزل' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  label!: string;

  @ApiProperty({ example: 'نابلس، شارع رفيديا، عمارة القدس، الطابق الثالث' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  detail!: string;

  @ApiPropertyOptional({ example: 'uuid-of-area' })
  @IsOptional()
  @IsUUID()
  areaId?: string;
}

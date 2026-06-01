import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

/**
 * Public customer self-registration.
 * Role is NOT accepted from the client — always hardcoded to CUSTOMER in AuthService.
 * Business registration uses RegisterBusinessDto; admin/driver accounts are created
 * by an admin only.
 */
export class RegisterDto {
  @ApiProperty({ example: 'أحمد محمد' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: '0599123456', description: 'رقم هاتف فلسطيني' })
  @Matches(/^0(5[69])\d{7}$/, { message: 'رقم الهاتف غير صالح' })
  phone!: string;

  @ApiProperty({ example: 'secret123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiPropertyOptional({ description: 'معرّف المنطقة' })
  @IsOptional()
  @IsString()
  areaId?: string;
}

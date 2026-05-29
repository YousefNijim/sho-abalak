import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { UserRole } from '@shu/shared-types';

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

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.CUSTOMER })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ description: 'معرّف المنطقة' })
  @IsOptional()
  @IsString()
  areaId?: string;
}

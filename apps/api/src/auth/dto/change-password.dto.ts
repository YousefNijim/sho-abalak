import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: 'كلمة المرور الحالية' })
  @IsString()
  currentPassword!: string;

  @ApiProperty({ description: 'كلمة المرور الجديدة', minLength: 6 })
  @IsString()
  @MinLength(6)
  newPassword!: string;
}

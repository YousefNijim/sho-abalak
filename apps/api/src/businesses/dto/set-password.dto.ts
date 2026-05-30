import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

/** Admin sets / resets a store's password (approval or reset). */
export class SetPasswordDto {
  @ApiProperty({ description: 'كلمة المرور', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;
}

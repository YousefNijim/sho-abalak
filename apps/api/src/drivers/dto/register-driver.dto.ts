import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

/** يُرسلها مستخدم بدور DRIVER لإنشاء ملف السائق الخاص به. */
export class RegisterDriverDto {
  @ApiProperty({ description: 'معرّف المنطقة التي يعمل بها السائق' })
  @IsString()
  areaId!: string;
}

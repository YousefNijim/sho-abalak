import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { UserRole, UserStatus } from '@shu/shared-types';

/** فلترة قائمة المستخدمين في لوحة الأدمن (حسب الدور والحالة والبحث). */
export class QueryUsersDto {
  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ description: 'بحث بالاسم أو رقم الهاتف' })
  @IsOptional()
  @IsString()
  search?: string;
}

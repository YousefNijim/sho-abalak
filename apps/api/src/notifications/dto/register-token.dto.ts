import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class RegisterTokenDto {
  @ApiProperty({ description: 'رمز جهاز FCM/Expo' })
  @IsString()
  @MaxLength(4096)
  token!: string;

  @ApiPropertyOptional({ enum: ['ios', 'android', 'web'] })
  @IsOptional()
  @IsIn(['ios', 'android', 'web'])
  platform?: string;

  @ApiPropertyOptional({ enum: ['customer', 'business', 'driver'] })
  @IsOptional()
  @IsIn(['customer', 'business', 'driver'])
  app?: string;
}

export class UnregisterTokenDto {
  @ApiProperty({ description: 'رمز الجهاز المراد إزالته' })
  @IsString()
  @MaxLength(4096)
  token!: string;
}

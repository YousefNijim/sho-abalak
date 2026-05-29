import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class RequestOtpDto {
  @ApiProperty({ example: '0599123456' })
  @IsString()
  phone!: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '0599123456' })
  @IsString()
  phone!: string;

  @ApiProperty({ example: '0000' })
  @IsString()
  @Length(4, 4)
  code!: string;
}

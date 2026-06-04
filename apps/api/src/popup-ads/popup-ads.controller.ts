import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PopupAdsService } from './popup-ads.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@shu/shared-types';

class CreatePopupAdDto {
  @ApiProperty()
  @IsString()
  imageUrl!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  buttonText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  buttonUrl?: string;

  @ApiPropertyOptional({ default: 'home', description: 'home | cart | orders | business_detail | all' })
  @IsOptional()
  @IsString()
  targetPage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 0, description: '0=always, 24=once/day' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  intervalHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startsAt?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endsAt?: Date;
}

class UpdatePopupAdDto {
  @ApiPropertyOptional() @IsOptional() @IsString() imageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() buttonText?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() buttonUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() targetPage?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Type(() => Number) intervalHours?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startsAt?: Date;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endsAt?: Date;
}

@ApiTags('popup-ads')
@Controller('popup-ads')
export class PopupAdsController {
  constructor(private readonly service: PopupAdsService) {}

  /** Public endpoint — returns active ads for a given page */
  @Get()
  findAll(@Query('page') page?: string, @Query('admin') admin?: string) {
    if (admin === 'true') return this.service.findAllAdmin();
    return this.service.findAll(page);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreatePopupAdDto) {
    return this.service.create(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePopupAdDto) {
    return this.service.update(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

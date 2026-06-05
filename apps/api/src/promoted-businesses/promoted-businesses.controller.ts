import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PromotedBusinessesService } from './promoted-businesses.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@shu/shared-types';

class CreatePromotedBusinessDto {
  @ApiProperty()
  @IsString()
  businessId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPopup?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  priority?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startsAt?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endsAt?: Date;
}

class UpdatePromotedBusinessDto {
  @ApiPropertyOptional() @IsOptional() @IsString() businessId?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPopup?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Type(() => Number) priority?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startsAt?: Date;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endsAt?: Date;
}

@ApiTags('promoted-businesses')
@Controller('promoted-businesses')
export class PromotedBusinessesController {
  constructor(private readonly service: PromotedBusinessesService) {}

  /** Public — returns active promoted businesses, optionally filtered by areaId */
  @Get()
  findAll(
    @Query('areaId') areaId?: string,
    @Query('admin') admin?: string,
  ) {
    if (admin === 'true') return this.service.findAllAdmin();
    return this.service.findAll(areaId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreatePromotedBusinessDto) {
    return this.service.create(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePromotedBusinessDto) {
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

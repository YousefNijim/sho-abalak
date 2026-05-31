import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiPropertyOptional, ApiBearerAuth } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { BusinessType, UserRole } from '@shu/shared-types';
import { TagsService } from './tags.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

class QueryTagsDto {
  @ApiPropertyOptional({ enum: BusinessType })
  @IsOptional()
  @IsEnum(BusinessType)
  type?: BusinessType;
}

@ApiTags('tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly tags: TagsService) {}

  /** قائمة الوسوم المعرّفة مسبقاً (اختياري: حسب القسم) — عامة. */
  @Get()
  findAll(@Query() query: QueryTagsDto) {
    return this.tags.findAll(query.type);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() data: { name: string; type: BusinessType; imageUrl?: string }) {
    return this.tags.create(data);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() data: { name?: string; type?: BusinessType; imageUrl?: string }
  ) {
    return this.tags.update(id, data);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tags.remove(id);
  }
}

import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { BusinessType } from '@shu/shared-types';
import { TagsService } from './tags.service';

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
}

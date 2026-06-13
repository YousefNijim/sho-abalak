import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@shu/shared-types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/jwt.strategy';
import { CategoryGroupsService } from './category-groups.service';
import { UploadsService } from '../uploads/uploads.service';

// ── Admin routes ─────────────────────────────────────────────────────────────

@ApiTags('admin-category-groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/category-groups')
export class AdminCategoryGroupsController {
  constructor(private readonly svc: CategoryGroupsService) {}

  @Get()
  findAll() {
    return this.svc.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.svc.findById(id);
  }

  @Post()
  create(@Body() dto: { name: string; description?: string; imageUrl?: string }) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: { name?: string; description?: string; imageUrl?: string; isActive?: boolean },
  ) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.svc.delete(id);
  }

  @Get(':id/templates')
  getTemplates(@Param('id') id: string) {
    return this.svc.getTemplatesByGroup(id);
  }

  @Post(':id/templates')
  createTemplate(
    @Param('id') groupId: string,
    @Body() dto: { name: string; imageUrl?: string; parentId?: string; sortOrder?: number },
  ) {
    return this.svc.createTemplate(groupId, dto);
  }

  @Get(':id/businesses')
  getBusinesses(@Param('id') id: string) {
    return this.svc.getBusinessesForGroup(id);
  }

  @Post(':id/assign')
  assign(@Param('id') groupId: string, @Body('businessIds') businessIds: string[]) {
    return this.svc.assignToBusinesses(groupId, businessIds);
  }

  @Delete(':id/assign/:businessId')
  removeAssignment(@Param('id') groupId: string, @Param('businessId') businessId: string) {
    return this.svc.removeFromBusiness(groupId, businessId);
  }
}

@ApiTags('admin-category-templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/category-templates')
export class AdminCategoryTemplatesController {
  constructor(
    private readonly svc: CategoryGroupsService,
    private readonly uploadsService: UploadsService,
  ) {}

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: { name?: string; imageUrl?: string; parentId?: string; sortOrder?: number; isActive?: boolean },
  ) {
    return this.svc.updateTemplate(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.svc.deleteTemplate(id);
  }

  @Post(':id/image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('لم يتم إرفاق ملف');
    const resultUrl = await this.uploadsService.saveFile(file as any);
    return this.svc.updateTemplate(id, { imageUrl: resultUrl });
  }
}

// ── Business owner routes ─────────────────────────────────────────────────────

@ApiTags('business-categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.BUSINESS)
@Controller('business/categories')
export class BusinessCategoriesController {
  constructor(private readonly svc: CategoryGroupsService) {}

  @Get()
  getMyTemplates(@CurrentUser() user: AuthUser, @Query('enabled') enabled?: string) {
    if (enabled === 'true') {
      return this.svc.getEnabledTemplatesForBusinessOwner(user.id);
    }
    return this.svc.getTemplatesForBusinessOwner(user.id);
  }

  @Patch(':templateId/toggle')
  toggle(
    @CurrentUser() user: AuthUser,
    @Param('templateId') templateId: string,
    @Body('isEnabled') isEnabled: boolean,
  ) {
    return this.svc.toggleTemplateByOwner(user.id, templateId, isEnabled);
  }
}

// ── Public route ──────────────────────────────────────────────────────────────

@ApiTags('businesses')
@Controller('businesses')
export class BusinessPublicCategoriesController {
  constructor(private readonly svc: CategoryGroupsService) {}

  @Get(':id/categories')
  getCategories(@Param('id') businessId: string) {
    return this.svc.getEnabledTemplatesForBusiness(businessId);
  }
}

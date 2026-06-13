import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@shu/shared-types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/jwt.strategy';
import { CategoryGroupsService } from './category-groups.service';
import { CategoryTemplatesService } from './category-templates.service';
import { BusinessCategoriesService } from './business-categories.service';
import { CreateCategoryGroupDto } from './dto/create-group.dto';
import { CreateCategoryTemplateDto } from './dto/create-template.dto';
import { AssignGroupDto } from './dto/assign-group.dto';
import { UploadsService } from '../uploads/uploads.service';

@ApiTags('categories')
@Controller()
export class CategoriesController {
  constructor(
    private readonly groupsService: CategoryGroupsService,
    private readonly templatesService: CategoryTemplatesService,
    private readonly businessCategoriesService: BusinessCategoriesService,
    private readonly uploadsService: UploadsService,
  ) {}

  // ── Admin: Category Groups ────────────────────────────────────────────────
  @Get('admin/category-groups')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getGroups() {
    return this.groupsService.findAll();
  }

  @Post('admin/category-groups')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  createGroup(@Body() dto: CreateCategoryGroupDto) {
    return this.groupsService.create(dto);
  }

  @Patch('admin/category-groups/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updateGroup(@Param('id') id: string, @Body() dto: Partial<CreateCategoryGroupDto>) {
    return this.groupsService.update(id, dto);
  }

  @Delete('admin/category-groups/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  deleteGroup(@Param('id') id: string) {
    return this.groupsService.remove(id);
  }

  @Get('admin/category-groups/:id/businesses')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getAssignedBusinesses(@Param('id') id: string) {
    return this.groupsService.getAssignedBusinesses(id);
  }

  @Post('admin/category-groups/:id/assign')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  assignGroup(@Param('id') id: string, @Body() dto: AssignGroupDto) {
    return this.groupsService.assignToBusinesses(id, dto);
  }

  @Delete('admin/category-groups/:id/assign/:businessId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  removeAssignment(@Param('id') id: string, @Param('businessId') businessId: string) {
    return this.groupsService.removeFromBusiness(id, businessId);
  }

  // ── Admin: Category Templates ─────────────────────────────────────────────
  @Get('admin/category-groups/:id/templates')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getTemplates(@Param('id') id: string) {
    return this.templatesService.findByGroup(id);
  }

  @Post('admin/category-groups/:id/templates')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  createTemplate(@Param('id') id: string, @Body() dto: CreateCategoryTemplateDto) {
    return this.templatesService.create(id, dto);
  }

  @Patch('admin/category-templates/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updateTemplate(@Param('id') id: string, @Body() dto: Partial<CreateCategoryTemplateDto>) {
    return this.templatesService.update(id, dto);
  }

  @Delete('admin/category-templates/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  deleteTemplate(@Param('id') id: string) {
    return this.templatesService.remove(id);
  }

  @Post('admin/category-templates/:id/image')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async uploadTemplateImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    const result = await this.uploadsService.uploadImage(file);
    return this.templatesService.updateImage(id, result.secure_url);
  }

  // ── Business Owner Endpoints ──────────────────────────────────────────────
  @Get('business/categories')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS)
  getMyCategories(@CurrentUser() user: AuthUser) {
    return this.businessCategoriesService.getForOwner(user.id, false);
  }

  @Patch('business/categories/:templateId/toggle')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS)
  toggleTemplate(
    @CurrentUser() user: AuthUser,
    @Param('templateId') templateId: string,
    @Body('isEnabled') isEnabled: boolean,
  ) {
    return this.businessCategoriesService.toggleTemplate(user.id, templateId, isEnabled);
  }

  // ── Public / Customer App Endpoints ───────────────────────────────────────
  @Get('businesses/:id/categories')
  getBusinessCategories(@Param('id') id: string) {
    return this.businessCategoriesService.getForBusiness(id, true);
  }
}

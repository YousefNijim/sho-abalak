import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@shu/shared-types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/jwt.strategy';
import { ProductsService } from './products.service';
import { CategoriesService } from './categories.service';
import { VariantsService } from './variants.service';
import { InventoryService } from './inventory.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateVariantDto } from './dto/create-variant.dto';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly products: ProductsService,
    private readonly categories: CategoriesService,
    private readonly variants: VariantsService,
    private readonly inventory: InventoryService,
  ) {}

  // ── Products ─────────────────────────────────────────────────────────────

  @Get('search')
  search(@Query('q') q: string, @Query('areaId') areaId?: string) {
    if (!q || q.trim().length < 2) return [];
    return this.products.search(q.trim(), areaId);
  }

  @Get('barcode/:code')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS)
  findByBarcode(@Param('code') code: string, @Query('businessId') businessId: string) {
    return this.products.findByBarcode(code, businessId);
  }

  @Get('low-stock')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS)
  getLowStock(@Query('businessId') businessId: string) {
    return this.inventory.getLowStockProducts(businessId);
  }

  @Get()
  findByBusiness(@Query('businessId') businessId: string) {
    return this.products.findByBusiness(businessId);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProductDto) {
    return this.products.create(user.id, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS)
  update(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: UpdateProductDto) {
    return this.products.update(id, user.id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.products.remove(id, user.id);
  }

  // ── Variants ──────────────────────────────────────────────────────────────

  @Get(':id/variants')
  getVariants(@Param('id') productId: string) {
    return this.variants.findByProduct(productId);
  }

  @Post(':id/variants')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS)
  createVariant(
    @Param('id') productId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateVariantDto,
  ) {
    return this.variants.create(productId, user.id, dto);
  }

  @Patch(':id/variants/:vid')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS)
  updateVariant(
    @Param('id') productId: string,
    @Param('vid') variantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: Partial<CreateVariantDto>,
  ) {
    return this.variants.update(productId, variantId, user.id, dto);
  }

  @Delete(':id/variants/:vid')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS)
  deleteVariant(
    @Param('id') productId: string,
    @Param('vid') variantId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.variants.remove(productId, variantId, user.id);
  }
}

// ── Product Categories (separate prefix for clarity) ─────────────────────────

@ApiTags('product-categories')
@Controller('product-categories')
export class ProductCategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  findByBusiness(@Query('businessId') businessId: string) {
    return this.categories.findByBusiness(businessId);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS)
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCategoryDto & { businessId: string },
  ) {
    return this.categories.create(user.id, dto);
  }

  @Patch('reorder')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS)
  reorder(@CurrentUser() user: AuthUser, @Body('ids') ids: string[]) {
    return this.categories.reorder(user.id, ids);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS)
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: Partial<CreateCategoryDto>,
  ) {
    return this.categories.update(id, user.id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.categories.remove(id, user.id);
  }
}

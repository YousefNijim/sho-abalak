import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, Res, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import * as xlsx from 'xlsx';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@shu/shared-types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/jwt.strategy';
import { ProductsService } from './products.service';
import { ImportService, ImportRow } from './import.service';
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
    private readonly importService: ImportService,
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

  @Get('low-stock/all')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getAllLowStock() {
    return this.inventory.getAllLowStockProducts();
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

  @Get('import/template')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS)
  downloadTemplate(@Res() res: Response) {
    const wb = xlsx.utils.book_new();
    
    const headersAr = ['اسم المنتج', 'التصنيف', 'السعر', 'الكمية', 'الباركود', 'الوحدة', 'الوصف', 'متاح (true/false)'];
    const headersEn = ['name', 'categoryName', 'price', 'stock', 'barcode', 'unit', 'description', 'isAvailable'];
    
    const example1 = ['تفاحة فوجي', 'فواكه', 15, 100, '123456789', 'كغ', 'تفاح طازج', true];
    const example2 = ['حليب المراعي', 'ألبان', 6.5, 50, '987654321', 'لتر', 'حليب كامل الدسم', true];
    
    const ws = xlsx.utils.aoa_to_sheet([headersAr, headersEn, example1, example2]);
    xlsx.utils.book_append_sheet(wb, ws, 'Products');
    
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Disposition', 'attachment; filename=products-template.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  }

  @Post('import')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async importProducts(
    @CurrentUser() user: AuthUser,
    @Query('businessId') businessId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('لم يتم إرفاق ملف');
    }

    try {
      const workbook = xlsx.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      
      const rawData: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      
      if (rawData.length < 3) {
        throw new BadRequestException('الملف فارغ أو لا يحتوي على بيانات كافية');
      }

      const keys = rawData[1] as string[];
      const rows: ImportRow[] = [];
      
      for (let i = 2; i < rawData.length; i++) {
        const dataRow = rawData[i];
        if (!dataRow || dataRow.length === 0 || !dataRow.some(val => val !== undefined && val !== null && val !== '')) continue;
        
        const rowObj: any = {};
        for (let j = 0; j < keys.length; j++) {
           const key = keys[j]?.trim();
           if (key) {
             rowObj[key] = dataRow[j];
           }
        }
        
        let isAvailable = true;
        if (rowObj.isAvailable !== undefined) {
          if (typeof rowObj.isAvailable === 'string') {
            isAvailable = rowObj.isAvailable.toLowerCase() !== 'false' && rowObj.isAvailable !== '0';
          } else {
            isAvailable = Boolean(rowObj.isAvailable);
          }
        }
        
        rows.push({
          name: rowObj.name,
          categoryName: rowObj.categoryName || rowObj.category,
          price: rowObj.price,
          stock: rowObj.stock,
          barcode: rowObj.barcode,
          unit: rowObj.unit,
          description: rowObj.description,
          isAvailable,
        });
      }

      return await this.importService.importProducts(businessId, user.id, rows);
    } catch (e: any) {
      throw new BadRequestException(`فشل قراءة الملف: ${e.message}`);
    }
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

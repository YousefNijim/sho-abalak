import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ImportRow {
  name: string;
  category?: string;
  categoryName?: string;
  price: number;
  stock?: number;
  barcode?: string;
  unit?: string;
  description?: string;
  isAvailable?: boolean;
}

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; reason: string }>;
}

@Injectable()
export class ImportService {
  constructor(private readonly prisma: PrismaService) {}

  async importProducts(
    businessId: string,
    ownerId: string,
    rows: ImportRow[]
  ): Promise<ImportResult> {
    const result: ImportResult = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    const business = await this.prisma.business.findFirst({
      where: { id: businessId, ownerId },
    });

    if (!business) {
      throw new BadRequestException('لا تملك صلاحية التعديل على هذه المنشأة');
    }

    await this.prisma.$transaction(async (tx) => {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 3; // +1 for 0-index, +2 for 2 header rows

        if (!row.name || row.name.toString().trim() === '') {
          result.errors.push({ row: rowNum, reason: 'اسم المنتج مطلوب' });
          result.skipped++;
          continue;
        }

        const price = Number(row.price);
        if (isNaN(price) || price <= 0) {
          result.errors.push({ row: rowNum, reason: 'السعر يجب أن يكون رقماً أكبر من صفر' });
          result.skipped++;
          continue;
        }

        let categoryId: string | undefined = undefined;
        let templateId: string | undefined = undefined;
        let categoryString: string | undefined = undefined;

        const catName = row.categoryName || row.category;
        if (catName && catName.toString().trim() !== '') {
          if (business.type === 'STORE') {
            // Try new system: find a CategoryTemplate assigned to this business by name
            const tpl = await (this.prisma as any).categoryTemplate.findFirst({
              where: {
                name: catName.toString().trim(),
                group: { assignments: { some: { businessId, isActive: true } } },
              },
            });
            if (tpl) {
              templateId = tpl.id;
            } else {
              // Fall back to legacy ProductCategory
              let cat = await tx.productCategory.findFirst({
                where: { businessId, name: catName.toString().trim() },
              });
              if (!cat) {
                const maxCat = await tx.productCategory.findFirst({
                  where: { businessId },
                  orderBy: { sortOrder: 'desc' },
                });
                const sortOrder = maxCat ? maxCat.sortOrder + 1 : 0;
                cat = await tx.productCategory.create({
                  data: { businessId, name: catName.toString().trim(), sortOrder },
                });
              }
              categoryId = cat.id;
            }
          } else {
            categoryString = catName.toString().trim();
          }
        }

        const barcode = row.barcode?.toString().trim();
        const stock = row.stock !== undefined && row.stock !== null && String(row.stock).trim() !== '' ? Number(row.stock) : undefined;
        const validStock = isNaN(stock as any) ? undefined : stock;

        if (barcode && barcode !== '') {
          const existing = await tx.product.findFirst({
            where: { businessId, barcode },
          });

          if (existing) {
            await tx.product.update({
              where: { id: existing.id },
              data: {
                name: row.name.toString().trim(),
                price,
                stock: validStock,
                unit: row.unit?.toString().trim(),
                description: row.description?.toString().trim(),
                isAvailable: row.isAvailable !== undefined ? row.isAvailable : true,
                categoryId,
                ...(templateId ? { templateId } : {}),
                category: categoryString,
              },
            });
            result.updated++;
            continue;
          }
        }

        await tx.product.create({
          data: {
            businessId,
            name: row.name.toString().trim(),
            price,
            stock: validStock,
            unit: row.unit?.toString().trim(),
            barcode: barcode && barcode !== '' ? barcode : undefined,
            description: row.description?.toString().trim(),
            isAvailable: row.isAvailable !== undefined ? row.isAvailable : true,
            categoryId,
            ...(templateId ? { templateId } : {}),
            category: categoryString,
          },
        });
        result.created++;
      }
    }, { timeout: 30000 });

    return result;
  }
}

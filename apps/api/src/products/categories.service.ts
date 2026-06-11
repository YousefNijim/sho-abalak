import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns flat list of all categories for a business, ordered by sortOrder. */
  findByBusiness(businessId: string) {
    return this.prisma.productCategory.findMany({
      where: { businessId, parentId: null },
      include: { children: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async create(ownerId: string, dto: CreateCategoryDto & { businessId: string }) {
    await this.assertOwnsBusiness(dto.businessId, ownerId);
    return this.prisma.productCategory.create({
      data: {
        businessId: dto.businessId,
        name: dto.name,
        parentId: dto.parentId ?? null,
        imageUrl: dto.imageUrl ?? null,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async update(id: string, ownerId: string, dto: Partial<CreateCategoryDto>) {
    await this.assertOwnsCategory(id, ownerId);
    return this.prisma.productCategory.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
  }

  async remove(id: string, ownerId: string) {
    await this.assertOwnsCategory(id, ownerId);
    await this.prisma.productCategory.delete({ where: { id } });
    return { deleted: true };
  }

  /** Batch-update sortOrder for a list of category ids. */
  async reorder(ownerId: string, ids: string[]) {
    if (ids.length === 0) return { reordered: true };
    const first = await this.prisma.productCategory.findUnique({ where: { id: ids[0] }, include: { business: true } });
    if (!first || first.business.ownerId !== ownerId) {
      throw new ForbiddenException('لا تملك صلاحية إعادة ترتيب هذه التصنيفات');
    }
    await this.prisma.$transaction(
      ids.map((catId, idx) =>
        this.prisma.productCategory.update({
          where: { id: catId },
          data: { sortOrder: idx },
        }),
      ),
    );
    return { reordered: true };
  }

  private async assertOwnsBusiness(businessId: string, ownerId: string) {
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new NotFoundException('المنشأة غير موجودة');
    if (business.ownerId !== ownerId) throw new ForbiddenException('لا تملك صلاحية التعديل على هذه المنشأة');
  }

  private async assertOwnsCategory(categoryId: string, ownerId: string) {
    const cat = await this.prisma.productCategory.findUnique({
      where: { id: categoryId },
      include: { business: true },
    });
    if (!cat) throw new NotFoundException('التصنيف غير موجود');
    if (cat.business.ownerId !== ownerId) throw new ForbiddenException('لا تملك صلاحية التعديل على هذا التصنيف');
  }
}

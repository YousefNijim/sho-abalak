import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const PRODUCT_INCLUDE = {
  variants: { where: { isAvailable: true }, orderBy: { sortOrder: 'asc' as const } },
  productCategory: true,
} as const;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Business owner: returns ALL products (available + unavailable) with variants. */
  async findByBusiness(businessId: string, categoryId?: string) {
    if (!categoryId) {
      return this.prisma.product.findMany({
        where: { businessId },
        include: PRODUCT_INCLUDE,
        orderBy: { name: 'asc' },
      });
    }

    const category = await this.prisma.productCategory.findUnique({
      where: { id: categoryId },
      include: { children: true },
    });

    if (!category) return [];

    const categoryIds = [category.id, ...category.children.map(c => c.id)];

    return this.prisma.product.findMany({
      where: {
        businessId,
        categoryId: { in: categoryIds },
      },
      include: PRODUCT_INCLUDE,
      orderBy: { name: 'asc' },
    });
  }

  search(query: string, areaId?: string) {
    return this.prisma.product.findMany({
      where: {
        isAvailable: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
        ...(areaId ? {
          business: {
            OR: [
              { deliveryAreas: { some: { id: areaId } } },
              { areaId },
            ],
          },
        } : {}),
      },
      include: {
        ...PRODUCT_INCLUDE,
        business: {
          select: { id: true, name: true, imageUrl: true, isOpen: true, area: { select: { city: true, name: true, deliveryFee: true } } },
        },
      },
      orderBy: { name: 'asc' },
      take: 30,
    });
  }

  /** Lookup by barcode — for USB/camera scanner in business app. */
  async findByBarcode(barcode: string, businessId: string) {
    const product = await this.prisma.product.findFirst({
      where: { barcode, businessId },
      include: PRODUCT_INCLUDE,
    });
    if (!product) throw new NotFoundException('لا يوجد منتج بهذا الباركود');
    return product;
  }

  async create(ownerId: string, dto: CreateProductDto) {
    const business = await this.ownedBusiness(ownerId);
    return this.prisma.product.create({
      data: { ...dto, businessId: business.id },
      include: PRODUCT_INCLUDE,
    });
  }

  async update(id: string, ownerId: string, dto: UpdateProductDto) {
    await this.assertOwnsProduct(id, ownerId);
    return this.prisma.product.update({
      where: { id },
      data: dto,
      include: PRODUCT_INCLUDE,
    });
  }

  async remove(id: string, ownerId: string) {
    await this.assertOwnsProduct(id, ownerId);
    await this.prisma.product.delete({ where: { id } });
    return { deleted: true };
  }

  private async ownedBusiness(ownerId: string) {
    const business = await this.prisma.business.findUnique({ where: { ownerId } });
    if (!business) throw new ForbiddenException('سجّل منشأتك أولاً');
    return business;
  }

  private async assertOwnsProduct(productId: string, ownerId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { business: true },
    });
    if (!product) throw new NotFoundException('المنتج غير موجود');
    if (product.business.ownerId !== ownerId) {
      throw new ForbiddenException('لا تملك صلاحية تعديل هذا المنتج');
    }
  }
}

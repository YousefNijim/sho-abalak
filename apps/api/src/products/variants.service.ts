import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVariantDto } from './dto/create-variant.dto';

@Injectable()
export class VariantsService {
  constructor(private readonly prisma: PrismaService) {}

  findByProduct(productId: string) {
    return this.prisma.productVariant.findMany({
      where: { productId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async create(productId: string, ownerId: string, dto: CreateVariantDto) {
    await this.assertOwnsProduct(productId, ownerId);
    const variant = await this.prisma.productVariant.create({
      data: {
        productId,
        name: dto.name,
        price: dto.price,
        stock: dto.stock ?? null,
        barcode: dto.barcode ?? null,
        sortOrder: dto.sortOrder ?? 0,
        isAvailable: dto.isAvailable ?? true,
      },
    });
    // Mark product as having variants
    await this.prisma.product.update({
      where: { id: productId },
      data: { hasVariants: true },
    });
    return variant;
  }

  async update(productId: string, variantId: string, ownerId: string, dto: Partial<CreateVariantDto>) {
    await this.assertOwnsProduct(productId, ownerId);
    const variant = await this.prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!variant || variant.productId !== productId) throw new NotFoundException('المتغير غير موجود');
    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.price !== undefined ? { price: dto.price } : {}),
        ...(dto.stock !== undefined ? { stock: dto.stock } : {}),
        ...(dto.barcode !== undefined ? { barcode: dto.barcode } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isAvailable !== undefined ? { isAvailable: dto.isAvailable } : {}),
      },
    });
  }

  async remove(productId: string, variantId: string, ownerId: string) {
    await this.assertOwnsProduct(productId, ownerId);
    const variant = await this.prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!variant || variant.productId !== productId) throw new NotFoundException('المتغير غير موجود');
    await this.prisma.productVariant.delete({ where: { id: variantId } });
    // If no variants left, clear the hasVariants flag
    const remaining = await this.prisma.productVariant.count({ where: { productId } });
    if (remaining === 0) {
      await this.prisma.product.update({ where: { id: productId }, data: { hasVariants: false } });
    }
    return { deleted: true };
  }

  private async assertOwnsProduct(productId: string, ownerId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { business: true },
    });
    if (!product) throw new NotFoundException('المنتج غير موجود');
    if (product.business.ownerId !== ownerId) throw new ForbiddenException('لا تملك صلاحية التعديل على هذا المنتج');
  }
}

import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  findByBusiness(businessId: string) {
    return this.prisma.product.findMany({ where: { businessId }, orderBy: { name: 'asc' } });
  }

  search(query: string) {
    return this.prisma.product.findMany({
      where: {
        isAvailable: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        business: {
          select: { id: true, name: true, imageUrl: true, isOpen: true, area: { select: { city: true, name: true, deliveryFee: true } } },
        },
      },
      orderBy: { name: 'asc' },
      take: 30,
    });
  }

  async create(ownerId: string, dto: CreateProductDto) {
    const business = await this.ownedBusiness(ownerId);
    return this.prisma.product.create({ data: { ...dto, businessId: business.id } });
  }

  async update(id: string, ownerId: string, dto: UpdateProductDto) {
    await this.assertOwnsProduct(id, ownerId);
    return this.prisma.product.update({ where: { id }, data: dto });
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

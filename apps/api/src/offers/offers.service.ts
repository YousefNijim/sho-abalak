import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOfferDto, UpdateOfferDto } from './dto/offer.dto';
import { randomUUID } from 'node:crypto';

const OFFER_INCLUDE = {
  offerBusinesses: { include: { business: { select: { id: true, name: true, imageUrl: true, rating: true, area: true } } } },
  offerProducts: { include: { product: { select: { id: true, name: true, price: true, imageUrl: true, category: true } } } },
};

@Injectable()
export class OffersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(activeOnly = false) {
    return this.prisma.offer.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      include: OFFER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const offer = await this.prisma.offer.findUnique({ where: { id }, include: OFFER_INCLUDE });
    if (!offer) throw new NotFoundException('العرض غير موجود');
    return offer;
  }

  async create(dto: CreateOfferDto) {
    return this.prisma.offer.create({
      data: {
        title: dto.title,
        description: dto.description,
        rules: dto.rules,
        imageUrl: dto.imageUrl,
        type: dto.type,
        offerBusinesses: {
          create: dto.businessIds.map((businessId) => ({ id: randomUUID(), businessId })),
        },
        offerProducts: dto.offerProducts?.length
          ? { create: dto.offerProducts.map((p) => ({ id: randomUUID(), productId: p.productId ?? null, categoryName: p.categoryName ?? null, discountPct: p.discountPct })) }
          : undefined,
      },
      include: OFFER_INCLUDE,
    });
  }

  async update(id: string, dto: UpdateOfferDto) {
    await this.findOne(id);
    return this.prisma.$transaction(async (tx) => {
      if (dto.businessIds !== undefined) {
        await tx.offerBusiness.deleteMany({ where: { offerId: id } });
        await tx.offerBusiness.createMany({
          data: dto.businessIds.map((businessId) => ({ id: randomUUID(), offerId: id, businessId })),
        });
      }
      if (dto.offerProducts !== undefined) {
        await tx.offerProduct.deleteMany({ where: { offerId: id } });
        if (dto.offerProducts.length) {
          await tx.offerProduct.createMany({
            data: dto.offerProducts.map((p) => ({ id: randomUUID(), offerId: id, productId: p.productId ?? null, categoryName: p.categoryName ?? null, discountPct: p.discountPct })),
          });
        }
      }
      return tx.offer.update({
        where: { id },
        data: {
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.rules !== undefined && { rules: dto.rules }),
          ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
          ...(dto.type !== undefined && { type: dto.type }),
        },
        include: OFFER_INCLUDE,
      });
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.offer.delete({ where: { id } });
    return { message: 'تم حذف العرض بنجاح' };
  }

  /** Returns offers that include this business (for business page display). */
  findForBusiness(businessId: string) {
    return this.prisma.offer.findMany({
      where: { isActive: true, offerBusinesses: { some: { businessId } } },
      include: OFFER_INCLUDE,
    });
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CreatePromotedBusinessDto {
  businessId: string;
  areaId?: string;
  isPopup?: boolean;
  isActive?: boolean;
  priority?: number;
  startsAt?: Date;
  endsAt?: Date;
}

interface UpdatePromotedBusinessDto extends Partial<CreatePromotedBusinessDto> {}

const BUSINESS_SELECT = {
  id: true,
  name: true,
  imageUrl: true,
  logoUrl: true,
  type: true,
  rating: true,
  isOpen: true,
  phone: true,
  addressDetail: true,
  openTime: true,
  closeTime: true,
  tags: { select: { id: true, name: true, type: true } },
  area: { select: { id: true, city: true, name: true, deliveryFee: true } },
};

@Injectable()
export class PromotedBusinessesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(areaId?: string) {
    const now = new Date();
    return this.prisma.promotedBusiness.findMany({
      where: {
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
        ...(areaId ? { OR: [{ areaId }, { areaId: null }] } : {}),
      },
      orderBy: { priority: 'desc' },
      include: {
        business: { select: BUSINESS_SELECT },
        area: { select: { id: true, city: true, name: true } },
      },
    });
  }

  async findAllAdmin() {
    return this.prisma.promotedBusiness.findMany({
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: {
        business: { select: { id: true, name: true, imageUrl: true, type: true } },
        area: { select: { id: true, city: true, name: true } },
      },
    });
  }

  async findOne(id: string) {
    const record = await this.prisma.promotedBusiness.findUnique({
      where: { id },
      include: { business: { select: BUSINESS_SELECT } },
    });
    if (!record) throw new NotFoundException('Promoted business not found');
    return record;
  }

  async create(data: CreatePromotedBusinessDto) {
    return this.prisma.promotedBusiness.create({
      data,
      include: { business: { select: BUSINESS_SELECT } },
    });
  }

  async update(id: string, data: UpdatePromotedBusinessDto) {
    await this.findOne(id);
    return this.prisma.promotedBusiness.update({
      where: { id },
      data,
      include: { business: { select: BUSINESS_SELECT } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.promotedBusiness.delete({ where: { id } });
  }
}

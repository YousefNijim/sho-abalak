import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CreatePopupAdDto {
  imageUrl: string;
  title?: string;
  buttonText?: string;
  buttonUrl?: string;
  targetPage?: string;
  isActive?: boolean;
  intervalHours?: number;
  startsAt?: Date;
  endsAt?: Date;
}

interface UpdatePopupAdDto extends Partial<CreatePopupAdDto> {}

@Injectable()
export class PopupAdsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page?: string) {
    const now = new Date();
    return this.prisma.popupAd.findMany({
      where: {
        isActive: true,
        ...(page && page !== 'all' ? {
          OR: [{ targetPage: page }, { targetPage: 'all' }],
        } : {}),
        OR: [
          { startsAt: null },
          { startsAt: { lte: now } },
        ],
        AND: [
          {
            OR: [
              { endsAt: null },
              { endsAt: { gte: now } },
            ],
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllAdmin() {
    return this.prisma.popupAd.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const ad = await this.prisma.popupAd.findUnique({ where: { id } });
    if (!ad) throw new NotFoundException('Popup ad not found');
    return ad;
  }

  async create(data: CreatePopupAdDto) {
    return this.prisma.popupAd.create({ data });
  }

  async update(id: string, data: UpdatePopupAdDto) {
    await this.findOne(id);
    return this.prisma.popupAd.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.popupAd.delete({ where: { id } });
  }
}

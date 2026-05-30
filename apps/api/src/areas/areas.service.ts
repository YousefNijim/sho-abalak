import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAreaDto, UpdateAreaDto } from './dto/create-area.dto';

@Injectable()
export class AreasService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.area.findMany({ orderBy: [{ city: 'asc' }, { name: 'asc' }] });
  }

  create(dto: CreateAreaDto) {
    return this.prisma.area.create({
      data: {
        city: dto.city,
        name: dto.name,
        deliveryFee: dto.deliveryFee,
      },
    });
  }

  async update(id: string, dto: UpdateAreaDto) {
    const area = await this.prisma.area.findUnique({ where: { id } });
    if (!area) throw new NotFoundException('المنطقة غير موجودة');

    return this.prisma.area.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string) {
    const area = await this.prisma.area.findUnique({ where: { id } });
    if (!area) throw new NotFoundException('المنطقة غير موجودة');

    return this.prisma.area.delete({ where: { id } });
  }
}

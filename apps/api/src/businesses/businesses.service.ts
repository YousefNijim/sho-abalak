import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { QueryBusinessDto } from './dto/query-business.dto';

@Injectable()
export class BusinessesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query: QueryBusinessDto) {
    const where: Prisma.BusinessWhereInput = {};
    if (query.category) where.category = query.category;
    if (query.areaId) where.areaId = query.areaId;
    if (query.search) where.name = { contains: query.search, mode: 'insensitive' };
    return this.prisma.business.findMany({ where, include: { area: true }, orderBy: { rating: 'desc' } });
  }

  async findOne(id: string) {
    const business = await this.prisma.business.findUnique({
      where: { id },
      include: { area: true, products: { where: { isAvailable: true } } },
    });
    if (!business) throw new NotFoundException('المنشأة غير موجودة');
    return business;
  }

  async findByOwner(ownerId: string) {
    const business = await this.prisma.business.findUnique({ where: { ownerId }, include: { area: true } });
    if (!business) throw new NotFoundException('لا توجد منشأة مرتبطة بحسابك');
    return business;
  }

  async create(ownerId: string, dto: CreateBusinessDto) {
    const existing = await this.prisma.business.findUnique({ where: { ownerId } });
    if (existing) throw new ConflictException('لديك منشأة مسجّلة بالفعل');
    return this.prisma.business.create({ data: { ...dto, ownerId } });
  }

  async update(id: string, ownerId: string, dto: UpdateBusinessDto) {
    await this.assertOwner(id, ownerId);
    return this.prisma.business.update({ where: { id }, data: dto });
  }

  private async assertOwner(id: string, ownerId: string) {
    const business = await this.prisma.business.findUnique({ where: { id } });
    if (!business) throw new NotFoundException('المنشأة غير موجودة');
    if (business.ownerId !== ownerId) throw new ForbiddenException('لا تملك صلاحية تعديل هذه المنشأة');
  }
}

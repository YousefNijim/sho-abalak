import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryGroupDto } from './dto/create-group.dto';
import { AssignGroupDto } from './dto/assign-group.dto';

@Injectable()
export class CategoryGroupsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.categoryGroup.findMany({
      include: {
        _count: {
          select: { templates: true, assignments: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string) {
    const group = await this.prisma.categoryGroup.findUnique({
      where: { id },
      include: {
        templates: { where: { parentId: null }, include: { children: { orderBy: { sortOrder: 'asc' } } }, orderBy: { sortOrder: 'asc' } }
      }
    });
    if (!group) throw new NotFoundException('مجموعة التصنيفات غير موجودة');
    return group;
  }

  create(dto: CreateCategoryGroupDto) {
    return this.prisma.categoryGroup.create({ data: dto });
  }

  async update(id: string, dto: Partial<CreateCategoryGroupDto>) {
    await this.findOne(id);
    return this.prisma.categoryGroup.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.categoryGroup.delete({ where: { id } });
  }

  async getAssignedBusinesses(id: string) {
    return this.prisma.businessCategoryGroup.findMany({
      where: { groupId: id },
      include: { business: { select: { id: true, name: true, type: true, imageUrl: true, isOpen: true } } }
    });
  }

  async assignToBusinesses(id: string, dto: AssignGroupDto) {
    await this.findOne(id);
    const results = [];
    for (const businessId of dto.businessIds) {
      const assignment = await this.prisma.businessCategoryGroup.upsert({
        where: { businessId_groupId: { businessId, groupId: id } },
        update: { isActive: true },
        create: { businessId, groupId: id, isActive: true }
      });
      results.push(assignment);
    }
    return results;
  }

  async removeFromBusiness(id: string, businessId: string) {
    await this.prisma.businessCategoryGroup.delete({
      where: { businessId_groupId: { businessId, groupId: id } }
    });
    return { success: true };
  }
}

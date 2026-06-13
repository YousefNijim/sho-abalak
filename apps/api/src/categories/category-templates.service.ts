import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryTemplateDto } from './dto/create-template.dto';

@Injectable()
export class CategoryTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  findByGroup(groupId: string) {
    return this.prisma.categoryTemplate.findMany({
      where: { groupId, parentId: null },
      include: { children: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' }
    });
  }

  create(groupId: string, dto: CreateCategoryTemplateDto) {
    return this.prisma.categoryTemplate.create({
      data: {
        ...dto,
        groupId,
      }
    });
  }

  async update(id: string, dto: Partial<CreateCategoryTemplateDto>) {
    const template = await this.prisma.categoryTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('التصنيف غير موجود');
    return this.prisma.categoryTemplate.update({
      where: { id },
      data: dto
    });
  }

  async remove(id: string) {
    const template = await this.prisma.categoryTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('التصنيف غير موجود');
    return this.prisma.categoryTemplate.delete({ where: { id } });
  }

  async updateImage(id: string, imageUrl: string) {
    const template = await this.prisma.categoryTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('التصنيف غير موجود');
    return this.prisma.categoryTemplate.update({
      where: { id },
      data: { imageUrl }
    });
  }
}

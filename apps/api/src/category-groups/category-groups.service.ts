import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoryGroupsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.categoryGroup.findMany({
      include: {
        _count: { select: { templates: true, assignments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const group = await this.prisma.categoryGroup.findUnique({
      where: { id },
      include: {
        templates: {
          where: { parentId: null },
          include: { children: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { sortOrder: 'asc' },
        },
        assignments: {
          include: { business: { select: { id: true, name: true, type: true, imageUrl: true } } },
        },
      },
    });
    if (!group) throw new NotFoundException('المجموعة غير موجودة');
    return group;
  }

  create(dto: { name: string; description?: string; imageUrl?: string }) {
    return this.prisma.categoryGroup.create({ data: dto });
  }

  async update(id: string, dto: { name?: string; description?: string; imageUrl?: string; isActive?: boolean }) {
    await this.assertExists(id);
    return this.prisma.categoryGroup.update({ where: { id }, data: dto });
  }

  async delete(id: string) {
    await this.assertExists(id);
    await this.prisma.categoryGroup.delete({ where: { id } });
    return { deleted: true };
  }

  async assignToBusinesses(groupId: string, businessIds: string[]) {
    await this.assertExists(groupId);
    const templates = await this.prisma.categoryTemplate.findMany({ where: { groupId } });

    await this.prisma.$transaction(async (tx) => {
      for (const businessId of businessIds) {
        await tx.businessCategoryGroup.upsert({
          where: { businessId_groupId: { businessId, groupId } },
          create: { businessId, groupId },
          update: { isActive: true },
        });
        // Create default overrides (all enabled) for templates not yet overridden
        for (const tpl of templates) {
          await tx.businessCategoryOverride.upsert({
            where: { businessId_categoryTemplateId: { businessId, categoryTemplateId: tpl.id } },
            create: { businessId, categoryTemplateId: tpl.id, isEnabled: true },
            update: {},
          });
        }
      }
    });

    return { assigned: businessIds.length };
  }

  async removeFromBusiness(groupId: string, businessId: string) {
    await this.prisma.businessCategoryGroup.delete({
      where: { businessId_groupId: { businessId, groupId } },
    });
    return { removed: true };
  }

  getBusinessesForGroup(groupId: string) {
    return this.prisma.businessCategoryGroup.findMany({
      where: { groupId },
      include: { business: { select: { id: true, name: true, type: true, imageUrl: true, isOpen: true } } },
    });
  }

  // ── Templates ────────────────────────────────────────────────────────────────

  getTemplatesByGroup(groupId: string) {
    return this.prisma.categoryTemplate.findMany({
      where: { groupId, parentId: null },
      include: { children: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createTemplate(groupId: string, dto: { name: string; imageUrl?: string; parentId?: string; sortOrder?: number }) {
    await this.assertExists(groupId);
    const template = await this.prisma.categoryTemplate.create({
      data: { groupId, ...dto },
    });

    // Create overrides for all businesses assigned to this group
    const assignments = await this.prisma.businessCategoryGroup.findMany({ where: { groupId } });
    if (assignments.length > 0) {
      await this.prisma.businessCategoryOverride.createMany({
        data: assignments.map((a) => ({
          businessId: a.businessId,
          categoryTemplateId: template.id,
          isEnabled: true,
        })),
        skipDuplicates: true,
      });
    }

    return template;
  }

  async updateTemplate(id: string, dto: { name?: string; imageUrl?: string; parentId?: string; sortOrder?: number; isActive?: boolean }) {
    const tpl = await this.prisma.categoryTemplate.findUnique({ where: { id } });
    if (!tpl) throw new NotFoundException('التصنيف غير موجود');
    return this.prisma.categoryTemplate.update({ where: { id }, data: dto });
  }

  async deleteTemplate(id: string) {
    const tpl = await this.prisma.categoryTemplate.findUnique({ where: { id }, include: { _count: { select: { products: true } } } });
    if (!tpl) throw new NotFoundException('التصنيف غير موجود');
    if (tpl._count.products > 0) {
      throw new BadRequestException(`لا يمكن حذف التصنيف — يحتوي على ${tpl._count.products} منتج`);
    }
    await this.prisma.categoryTemplate.delete({ where: { id } });
    return { deleted: true };
  }

  // ── Business-facing ──────────────────────────────────────────────────────────

  async getTemplatesForBusiness(businessId: string) {
    const assignments = await this.prisma.businessCategoryGroup.findMany({
      where: { businessId, isActive: true },
      include: {
        group: {
          include: {
            templates: {
              where: { parentId: null, isActive: true },
              include: { children: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } } },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    const overrides = await this.prisma.businessCategoryOverride.findMany({ where: { businessId } });
    const overrideMap = new Map(overrides.map((o) => [o.categoryTemplateId, o.isEnabled]));

    const applyOverride = (tpl: any): any => ({
      ...tpl,
      isEnabled: overrideMap.get(tpl.id) ?? true,
      children: (tpl.children ?? []).map(applyOverride),
    });

    return assignments.flatMap((a) => a.group.templates.map(applyOverride));
  }

  async getEnabledTemplatesForBusiness(businessId: string) {
    const all = await this.getTemplatesForBusiness(businessId);
    const filterEnabled = (tpl: any): any | null => {
      if (!tpl.isEnabled) return null;
      return { ...tpl, children: (tpl.children ?? []).map(filterEnabled).filter(Boolean) };
    };
    return all.map(filterEnabled).filter(Boolean);
  }

  async toggleTemplate(businessId: string, categoryTemplateId: string, isEnabled: boolean) {
    return this.prisma.businessCategoryOverride.upsert({
      where: { businessId_categoryTemplateId: { businessId, categoryTemplateId } },
      create: { businessId, categoryTemplateId, isEnabled },
      update: { isEnabled },
    });
  }

  // Convenience wrappers using ownerId → businessId
  async getTemplatesForBusinessOwner(ownerId: string) {
    const businessId = await this.resolveBusinessId(ownerId);
    return this.getTemplatesForBusiness(businessId);
  }

  async getEnabledTemplatesForBusinessOwner(ownerId: string) {
    const businessId = await this.resolveBusinessId(ownerId);
    return this.getEnabledTemplatesForBusiness(businessId);
  }

  async toggleTemplateByOwner(ownerId: string, categoryTemplateId: string, isEnabled: boolean) {
    const businessId = await this.resolveBusinessId(ownerId);
    return this.toggleTemplate(businessId, categoryTemplateId, isEnabled);
  }

  private async resolveBusinessId(ownerId: string): Promise<string> {
    const business = await this.prisma.business.findUnique({ where: { ownerId }, select: { id: true } });
    if (!business) throw new NotFoundException('لا توجد منشأة مرتبطة بحسابك');
    return business.id;
  }

  private async assertExists(id: string) {
    const group = await this.prisma.categoryGroup.findUnique({ where: { id } });
    if (!group) throw new NotFoundException('المجموعة غير موجودة');
  }
}

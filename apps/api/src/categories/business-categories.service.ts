import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BusinessCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async getForBusiness(businessId: string, enabledOnly = false) {
    const assignments = await this.prisma.businessCategoryGroup.findMany({
      where: { businessId, isActive: true },
      select: { groupId: true }
    });
    const groupIds = assignments.map(a => a.groupId);
    if (groupIds.length === 0) return [];

    const overrides = await this.prisma.businessCategoryOverride.findMany({
      where: { businessId }
    });
    const overrideMap = new Map(overrides.map(o => [o.categoryTemplateId, o.isEnabled]));

    const templates = await this.prisma.categoryTemplate.findMany({
      where: { groupId: { in: groupIds }, parentId: null, isActive: true },
      include: { children: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' }
    });

    const result = templates.map(t => {
      const isEnabled = overrideMap.has(t.id) ? overrideMap.get(t.id)! : true;
      const children = t.children.map(c => ({
        ...c,
        isEnabled: overrideMap.has(c.id) ? overrideMap.get(c.id)! : true
      }));
      
      return {
        ...t,
        isEnabled,
        children: enabledOnly ? children.filter(c => c.isEnabled) : children
      };
    });

    if (enabledOnly) {
      return result.filter(t => t.isEnabled);
    }
    return result;
  }

  async getForOwner(ownerId: string, enabledOnly = false) {
    const business = await this.prisma.business.findUnique({ where: { ownerId } });
    if (!business) throw new ForbiddenException('سجّل منشأتك أولاً');
    return this.getForBusiness(business.id, enabledOnly);
  }

  async toggleTemplate(ownerId: string, templateId: string, isEnabled: boolean) {
    const business = await this.prisma.business.findUnique({ where: { ownerId } });
    if (!business) throw new ForbiddenException('سجّل منشأتك أولاً');

    return this.prisma.businessCategoryOverride.upsert({
      where: { businessId_categoryTemplateId: { businessId: business.id, categoryTemplateId: templateId } },
      update: { isEnabled },
      create: { businessId: business.id, categoryTemplateId: templateId, isEnabled }
    });
  }
}

import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { UserRole, UserStatus } from '@shu/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { AdminCreateBusinessDto } from './dto/admin-create-business.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { QueryBusinessDto } from './dto/query-business.dto';

// Owner account fields the admin UI needs to show approval state (never the password hash).
const OWNER_SELECT = { id: true, name: true, phone: true, status: true } satisfies Prisma.UserSelect;

/** Build a Prisma `tags.connect` clause on create (skip when no tags given). */
function tagConnect(tagIds?: string[]) {
  if (!tagIds || tagIds.length === 0) return {};
  return { tags: { connect: tagIds.map((id) => ({ id })) } };
}

/** Build a Prisma `tags.set` clause on update — only when tagIds is provided (undefined = leave unchanged). */
function tagSet(tagIds?: string[]) {
  if (tagIds === undefined) return {};
  return { tags: { set: tagIds.map((id) => ({ id })) } };
}

/** Build a Prisma `deliveryAreas.connect` clause on create (skip when no deliveryAreaIds given). */
function deliveryAreaConnect(areaIds?: string[]) {
  if (!areaIds || areaIds.length === 0) return {};
  return { deliveryAreas: { connect: areaIds.map((id) => ({ id })) } };
}

/** Build a Prisma `deliveryAreas.set` clause on update — only when deliveryAreaIds is provided. */
function deliveryAreaSet(areaIds?: string[]) {
  if (areaIds === undefined) return {};
  return { deliveryAreas: { set: areaIds.map((id) => ({ id })) } };
}

@Injectable()
export class BusinessesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query: QueryBusinessDto) {
    const where: Prisma.BusinessWhereInput = {};
    if (query.type) where.type = query.type;
    if (query.tagId) where.tags = { some: { id: query.tagId } };
    
    if (query.areaId) {
      if (query.type === 'FOOD') {
        // For restaurants, check if the area is in their delivery areas OR is their own area
        where.OR = [
          { deliveryAreas: { some: { id: query.areaId } } },
          { areaId: query.areaId }
        ];
      } else {
        // For markets, just check their location
        where.areaId = query.areaId;
      }
    }
    
    if (query.search) where.name = { contains: query.search, mode: 'insensitive' };
    return this.prisma.business.findMany({
      where,
      include: { area: true, tags: true, owner: { select: OWNER_SELECT } },
      orderBy: { rating: 'desc' },
    });
  }

  async findOne(id: string) {
    const business = await this.prisma.business.findUnique({
      where: { id },
      include: { area: true, tags: true, products: { where: { isAvailable: true } } },
    });
    if (!business) throw new NotFoundException('المنشأة غير موجودة');
    return business;
  }

  async findByOwner(ownerId: string) {
    const business = await this.prisma.business.findUnique({
      where: { ownerId },
      include: { area: true, tags: true, deliveryAreas: true },
    });
    if (!business) throw new NotFoundException('لا توجد منشأة مرتبطة بحسابك');
    return business;
  }

  async create(ownerId: string, dto: CreateBusinessDto) {
    const existing = await this.prisma.business.findUnique({ where: { ownerId } });
    if (existing) throw new ConflictException('لديك منشأة مسجّلة بالفعل');
    const { tagIds, deliveryAreaIds, ...rest } = dto;
    return this.prisma.business.create({
      data: { ...rest, ownerId, ...tagConnect(tagIds), ...deliveryAreaConnect(deliveryAreaIds) },
      include: { area: true, tags: true, deliveryAreas: true },
    });
  }

  async update(id: string, ownerId: string, dto: UpdateBusinessDto) {
    await this.assertOwner(id, ownerId);
    const { tagIds, deliveryAreaIds, ...rest } = dto;
    return this.prisma.business.update({
      where: { id },
      data: { ...rest, ...tagSet(tagIds), ...deliveryAreaSet(deliveryAreaIds) },
      include: { area: true, tags: true, deliveryAreas: true },
    });
  }

  async adminUpdate(id: string, dto: UpdateBusinessDto) {
    const business = await this.prisma.business.findUnique({ where: { id } });
    if (!business) throw new NotFoundException('المنشأة غير موجودة');
    const { tagIds, deliveryAreaIds, ...rest } = dto;
    return this.prisma.business.update({
      where: { id },
      data: { ...rest, ...tagSet(tagIds), ...deliveryAreaSet(deliveryAreaIds) },
      include: { area: true, tags: true, deliveryAreas: true },
    });
  }

  async adminUpdateStatus(id: string, isOpen: boolean) {
    const business = await this.prisma.business.findUnique({ where: { id } });
    if (!business) throw new NotFoundException('المنشأة غير موجودة');
    return this.prisma.business.update({ where: { id }, data: { isOpen } });
  }

  async adminUpdateCommission(id: string, commissionRate: number) {
    const business = await this.prisma.business.findUnique({ where: { id } });
    if (!business) throw new NotFoundException('المنشأة غير موجودة');
    return this.prisma.business.update({ where: { id }, data: { commissionRate } });
  }

  /**
   * Admin approves a pending store and sets its first password.
   * Flips the owner User from PENDING → ACTIVE so it can log in.
   */
  async adminApprove(id: string, password: string) {
    const business = await this.prisma.business.findUnique({ where: { id }, include: { owner: true } });
    if (!business) throw new NotFoundException('المنشأة غير موجودة');
    if (business.owner.role !== UserRole.BUSINESS) {
      throw new ForbiddenException('الحساب المرتبط ليس حساب متجر');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.user.update({
      where: { id: business.ownerId },
      data: { password: passwordHash, status: UserStatus.ACTIVE },
    });
    return this.prisma.business.findUnique({
      where: { id },
      include: { area: true, deliveryAreas: true, owner: { select: OWNER_SELECT } },
    });
  }

  /** Admin rejects (deletes) a still-pending registration and its owner account. */
  async adminReject(id: string) {
    const business = await this.prisma.business.findUnique({ where: { id }, include: { owner: true } });
    if (!business) throw new NotFoundException('المنشأة غير موجودة');
    if (business.owner.status !== 'PENDING') {
      throw new ForbiddenException('لا يمكن رفض متجر مفعّل — استخدم التعليق/الحظر بدلاً من ذلك');
    }
    await this.prisma.$transaction([
      this.prisma.business.delete({ where: { id } }),
      this.prisma.user.delete({ where: { id: business.ownerId } }),
    ]);
    return { rejected: true };
  }

  /** Admin resets an existing store's password. */
  async adminResetPassword(id: string, password: string) {
    const business = await this.prisma.business.findUnique({ where: { id } });
    if (!business) throw new NotFoundException('المنشأة غير موجودة');
    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.user.update({
      where: { id: business.ownerId },
      data: { password: passwordHash },
    });
    return { reset: true };
  }

  /**
   * Admin creates a complete, immediately-active store from scratch:
   * owner User (ACTIVE + password) + Business, in one transaction.
   */
  async adminCreate(dto: AdminCreateBusinessDto) {
    const existing = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (existing) throw new ConflictException('رقم الهاتف مسجّل مسبقاً');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.$transaction(async (tx) => {
      const owner = await tx.user.create({
        data: {
          name: dto.ownerName,
          phone: dto.phone,
          password: passwordHash,
          role: UserRole.BUSINESS,
          status: UserStatus.ACTIVE,
          areaId: dto.areaId,
        },
      });
      return tx.business.create({
        data: {
          ownerId: owner.id,
          name: dto.name,
          type: dto.type,
          areaId: dto.areaId,
          phone: dto.phone,
          addressDetail: dto.addressDetail ?? null,
          ...tagConnect(dto.tagIds),
          ...deliveryAreaConnect(dto.deliveryAreaIds),
        },
        include: { area: true, tags: true, deliveryAreas: true, owner: { select: OWNER_SELECT } },
      });
    });
  }

  private async assertOwner(id: string, ownerId: string) {
    const business = await this.prisma.business.findUnique({ where: { id } });
    if (!business) throw new NotFoundException('المنشأة غير موجودة');
    if (business.ownerId !== ownerId) throw new ForbiddenException('لا تملك صلاحية تعديل هذه المنشأة');
  }

  /** تسوية حساب المنشأة (للوحة الأدمن). */
  async settleAccount(adminId: string, businessId: string, amount?: number) {
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new NotFoundException('المنشأة غير موجودة');

    const settleAmount = amount ?? Number(business.platformBalance);
    if (settleAmount <= 0) return business;

    return this.prisma.$transaction(async (tx) => {
      // Create a settlement record for history
      await tx.businessSettlement.create({
        data: {
          businessId,
          adminId,
          amount: settleAmount,
        },
      });

      // Decrement balance
      return tx.business.update({
        where: { id: businessId },
        data: { platformBalance: { decrement: settleAmount } },
        include: { area: true, tags: true, deliveryAreas: true, owner: { select: OWNER_SELECT } },
      });
    });
  }
}

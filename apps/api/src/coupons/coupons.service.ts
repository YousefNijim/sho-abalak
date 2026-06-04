import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCouponDto, UpdateCouponDto, ApplyCouponDto } from './dto/coupon.dto';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  }

  /** Public endpoint: return all active unused coupons so the customer can browse them. */
  findActive() {
    return this.prisma.coupon.findMany({
      where: { isActive: true, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const c = await this.prisma.coupon.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('الكوبون غير موجود');
    return c;
  }

  async create(dto: CreateCouponDto) {
    const code = dto.code.toUpperCase().trim();
    const exists = await this.prisma.coupon.findUnique({ where: { code } });
    if (exists) throw new ConflictException('كود الكوبون مستخدم مسبقاً');
    if (dto.discountType === 'FIXED' && !dto.discountAmount) {
      throw new BadRequestException('يجب تحديد قيمة الخصم للكوبون الثابت');
    }
    if (dto.discountType === 'PERCENTAGE' && !dto.discountPct) {
      throw new BadRequestException('يجب تحديد نسبة الخصم للكوبون النسبي');
    }
    return this.prisma.coupon.create({
      data: {
        code,
        discountType: dto.discountType,
        discountAmount: dto.discountAmount ?? 0,
        discountPct: dto.discountPct ?? null,
        maxDiscount: dto.maxDiscount ?? null,
        minimumOrder: dto.minimumOrder,
        issuedBy: dto.issuedBy,
      },
    });
  }

  async update(id: string, dto: UpdateCouponDto) {
    await this.findOne(id);
    return this.prisma.coupon.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.coupon.delete({ where: { id } });
    return { message: 'تم حذف الكوبون بنجاح' };
  }

  /** Validate a coupon and compute the exact discount amount for the given subtotal. */
  async apply(dto: ApplyCouponDto) {
    const code = dto.code.toUpperCase().trim();
    const coupon = await this.prisma.coupon.findUnique({ where: { code } });
    if (!coupon) throw new NotFoundException('كود الكوبون غير صحيح');
    if (!coupon.isActive || coupon.usedAt) throw new BadRequestException('هذا الكوبون مستخدم أو غير فعّال');
    if (dto.cartSubtotal < Number(coupon.minimumOrder)) {
      throw new BadRequestException(`الحد الأدنى لاستخدام هذا الكوبون ${coupon.minimumOrder} ₪`);
    }

    let discount: number;
    if (coupon.discountType === 'PERCENTAGE') {
      const raw = (dto.cartSubtotal * Number(coupon.discountPct ?? 0)) / 100;
      const max = coupon.maxDiscount ? Number(coupon.maxDiscount) : Infinity;
      discount = Math.min(raw, max, dto.cartSubtotal);
    } else {
      discount = Math.min(Number(coupon.discountAmount), dto.cartSubtotal);
    }

    return {
      code: coupon.code,
      discountAmount: Math.round(discount * 100) / 100,
      discountType: coupon.discountType,
      discountPct: coupon.discountPct ? Number(coupon.discountPct) : null,
      maxDiscount: coupon.maxDiscount ? Number(coupon.maxDiscount) : null,
      minimumOrder: Number(coupon.minimumOrder),
      issuedBy: coupon.issuedBy,
    };
  }

  /** Compute discount from a coupon object directly (used in order creation). */
  static computeDiscount(coupon: { discountType: string; discountAmount: Prisma.Decimal; discountPct: Prisma.Decimal | null; maxDiscount: Prisma.Decimal | null }, subtotal: Prisma.Decimal): Prisma.Decimal {
    if (coupon.discountType === 'PERCENTAGE') {
      const pct = Number(coupon.discountPct ?? 0) / 100;
      const raw = subtotal.mul(pct);
      const max = coupon.maxDiscount ?? new Prisma.Decimal(Infinity);
      return Prisma.Decimal.min(raw, max, subtotal);
    }
    return Prisma.Decimal.min(coupon.discountAmount, subtotal);
  }
}

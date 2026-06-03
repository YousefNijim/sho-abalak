import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCouponDto, UpdateCouponDto, ApplyCouponDto } from './dto/coupon.dto';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
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
    return this.prisma.coupon.create({ data: { code, discountAmount: dto.discountAmount, minimumOrder: dto.minimumOrder } });
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

  /** Validate a coupon code against a cart subtotal and return its discount amount. */
  async apply(dto: ApplyCouponDto) {
    const code = dto.code.toUpperCase().trim();
    const coupon = await this.prisma.coupon.findUnique({ where: { code } });
    if (!coupon) throw new NotFoundException('كود الكوبون غير صحيح');
    if (!coupon.isActive || coupon.usedAt) throw new BadRequestException('هذا الكوبون مستخدم أو غير فعّال');
    if (dto.cartSubtotal < Number(coupon.minimumOrder)) {
      throw new BadRequestException(`الحد الأدنى لاستخدام هذا الكوبون ${coupon.minimumOrder} ₪`);
    }
    const discount = Math.min(Number(coupon.discountAmount), dto.cartSubtotal);
    return { code: coupon.code, discountAmount: discount, minimumOrder: Number(coupon.minimumOrder) };
  }
}

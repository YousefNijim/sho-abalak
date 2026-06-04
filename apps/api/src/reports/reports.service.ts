import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@shu/shared-types';

export interface ReportFilters {
  period?: string;
  startDate?: string;
  endDate?: string;
  businessId?: string;
  customerId?: string;
  driverId?: string;
  areaId?: string;       // village
  city?: string;
  tagId?: string;
  businessType?: string;
  search?: string;       // search by customer/business/driver name
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private buildDateRange(period?: string, startDate?: string, endDate?: string): { start: Date; end: Date } {
    const now = new Date();
    let start = new Date();
    let end = new Date();
    end.setHours(23, 59, 59, 999);

    if (period === 'today') {
      start.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      start = new Date(now);
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
    } else if (period === 'month') {
      start = new Date(now);
      start.setMonth(now.getMonth() - 1);
      start.setHours(0, 0, 0, 0);
    } else if (period === 'custom') {
      if (!startDate || !endDate) throw new BadRequestException('يجب تحديد تاريخ البداية والنهاية');
      start = new Date(startDate); start.setHours(0, 0, 0, 0);
      end = new Date(endDate); end.setHours(23, 59, 59, 999);
    } else {
      start = new Date(now);
      start.setMonth(now.getMonth() - 1);
      start.setHours(0, 0, 0, 0);
    }
    return { start, end };
  }

  async getFinanceSummary(filters: ReportFilters) {
    const { start, end } = this.buildDateRange(filters.period, filters.startDate, filters.endDate);

    const where: Prisma.OrderWhereInput = {
      createdAt: { gte: start, lte: end },
    };

    if (filters.businessId) where.businessId = filters.businessId;
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.driverId) where.driverId = filters.driverId;
    if (filters.areaId) where.business = { ...((where.business as any) ?? {}), areaId: filters.areaId };
    if (filters.city) where.business = { ...((where.business as any) ?? {}), area: { city: { contains: filters.city, mode: 'insensitive' } } };
    if (filters.tagId) where.business = { ...((where.business as any) ?? {}), tags: { some: { id: filters.tagId } } };
    if (filters.businessType) where.business = { ...((where.business as any) ?? {}), type: filters.businessType as any };
    if (filters.search) {
      where.OR = [
        { business: { name: { contains: filters.search, mode: 'insensitive' } } },
        { customer: { name: { contains: filters.search, mode: 'insensitive' } } },
        { driver: { user: { name: { contains: filters.search, mode: 'insensitive' } } } },
      ];
    }

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        business: { include: { area: true, tags: { select: { name: true } } } },
        customer: { select: { id: true, name: true, phone: true } },
        driver: { include: { user: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const delivered = orders.filter((o) => o.status === OrderStatus.DELIVERED);

    let totalSubtotal = 0;
    let totalCouponDiscount = 0;
    let totalDeliveryFees = 0;
    let totalFinal = 0;
    let totalCommission = 0;

    let totalDriverDeliveryFees = 0;
    let totalPlatformDeliveryFees = 0;

    const rows = orders.map((o) => {
      const subtotal = Number((o as any).subtotal ?? o.total);
      const couponDiscount = Number((o as any).couponDiscount ?? 0);
      const deliveryFee = Number((o as any).deliveryFee ?? (o.business?.area?.deliveryFee ?? 0));
      const driverDeliveryFee = Number((o as any).driverDeliveryFee ?? (o.business?.area as any)?.driverDeliveryFee ?? 0);
      const platformDeliveryFee = Number((o as any).platformDeliveryFee ?? (deliveryFee - driverDeliveryFee));
      const finalTotal = Number(o.total);
      const rate = Number(o.business?.commissionRate ?? 10);
      const netSubtotal = subtotal - couponDiscount;
      const commission = o.status === OrderStatus.DELIVERED ? netSubtotal * (rate / 100) : 0;

      // Per-party earnings (only for DELIVERED)
      const businessEarnings = o.status === OrderStatus.DELIVERED ? netSubtotal - commission : 0;
      const driverEarnings = o.status === OrderStatus.DELIVERED ? driverDeliveryFee : 0;
      const platformEarnings = o.status === OrderStatus.DELIVERED ? commission + platformDeliveryFee : 0;

      // Coupon cost absorption
      const couponIssuedBy = (o as any).couponIssuedBy ?? null;
      // If coupon from PLATFORM, discount reduces platform earnings; if BUSINESS, reduces business earnings
      const platformCouponCost = couponIssuedBy === 'PLATFORM' ? couponDiscount : 0;
      const businessCouponCost = couponIssuedBy === 'BUSINESS' ? couponDiscount : 0;

      if (o.status === OrderStatus.DELIVERED) {
        totalSubtotal += subtotal;
        totalCouponDiscount += couponDiscount;
        totalDeliveryFees += deliveryFee;
        totalDriverDeliveryFees += driverDeliveryFee;
        totalPlatformDeliveryFees += platformDeliveryFee;
        totalFinal += finalTotal;
        totalCommission += commission;
      }

      return {
        id: o.id,
        businessName: o.business?.name ?? '—',
        businessType: o.business?.type ?? '—',
        businessCity: o.business?.area?.city ?? '—',
        businessArea: o.business?.area?.name ?? '—',
        businessTags: o.business?.tags?.map((t: any) => t.name).join(', ') ?? '—',
        customerName: o.customer?.name ?? '—',
        customerPhone: o.customer?.phone ?? '—',
        driverName: o.driver?.user?.name ?? '—',
        subtotal,
        couponDiscount,
        couponCode: (o as any).couponCode ?? null,
        couponIssuedBy,
        deliveryFee,
        driverDeliveryFee,
        platformDeliveryFee,
        total: finalTotal,
        commission,
        businessEarnings: businessEarnings - businessCouponCost,
        driverEarnings,
        platformEarnings: platformEarnings - platformCouponCost,
        paymentMethod: o.paymentMethod,
        status: o.status,
        createdAt: o.createdAt,
      };
    });

    const totalPlatformEarnings = totalCommission + totalPlatformDeliveryFees;
    const totalDriverEarnings = totalDriverDeliveryFees;
    const totalBusinessEarnings = (totalSubtotal - totalCouponDiscount) - totalCommission;

    return {
      summary: {
        totalSubtotal,
        totalCouponDiscount,
        totalDeliveryFees,
        totalDriverDeliveryFees,
        totalPlatformDeliveryFees,
        totalFinal,
        totalCommission,
        totalPlatformEarnings,
        totalDriverEarnings,
        totalBusinessEarnings,
        platformEarnings: totalPlatformEarnings,
        ordersCount: orders.length,
        deliveredCount: delivered.length,
        cancelledCount: orders.filter((o) => o.status === OrderStatus.CANCELLED).length,
      },
      orders: rows,
    };
  }
}

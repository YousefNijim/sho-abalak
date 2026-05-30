import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@shu/shared-types';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getFinanceSummary(period: string, startDate?: string, endDate?: string) {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (period === 'today') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (period === 'week') {
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (period === 'month') {
      start.setMonth(now.getMonth() - 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (period === 'custom') {
      if (!startDate || !endDate) {
        throw new BadRequestException('يجب تحديد تاريخ البداية والنهاية للفترة المخصصة');
      }
      start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    } else {
      // Default to month
      start.setMonth(now.getMonth() - 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    }

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        business: {
          include: { area: true },
        },
        customer: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const deliveredOrders = orders.filter((o) => o.status === OrderStatus.DELIVERED);

    let totalSales = 0;
    let totalCommission = 0;
    let totalDeliveryFees = 0;

    deliveredOrders.forEach((o) => {
      const salesVal = Number(o.total);
      totalSales += salesVal;

      const fee = o.business?.area?.deliveryFee ? Number(o.business.area.deliveryFee) : 3;
      totalDeliveryFees += fee;

      const subtotal = Math.max(0, salesVal - fee);
      const rate = o.business?.commissionRate ? Number(o.business.commissionRate) : 10;
      totalCommission += subtotal * (rate / 100);
    });

    const netRevenue = totalSales - totalCommission;

    return {
      summary: {
        totalSales,
        commission: totalCommission,
        deliveryFees: totalDeliveryFees,
        netRevenue,
        ordersCount: orders.length,
        deliveredCount: deliveredOrders.length,
        cancelledCount: orders.filter((o) => o.status === OrderStatus.CANCELLED).length,
      },
      orders: orders.map((o) => {
        const fee = o.business?.area?.deliveryFee ? Number(o.business.area.deliveryFee) : 3;
        const subtotal = Math.max(0, Number(o.total) - fee);
        const rate = o.business?.commissionRate ? Number(o.business.commissionRate) : 10;
        const comm = o.status === OrderStatus.DELIVERED ? subtotal * (rate / 100) : 0;

        return {
          id: o.id,
          businessName: o.business?.name ?? '—',
          customerName: o.customer?.name ?? '—',
          total: Number(o.total),
          commission: comm,
          deliveryFee: fee,
          paymentMethod: o.paymentMethod,
          status: o.status,
          createdAt: o.createdAt,
        };
      }),
    };
  }
}

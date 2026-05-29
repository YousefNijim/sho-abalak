import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OrderStatus, UserRole } from '@shu/shared-types';
import { canTransition } from '@shu/utils';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/jwt.strategy';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

const ORDER_INCLUDE = {
  items: { include: { product: true } },
  business: true,
  statusHistory: { orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.OrderInclude;

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(customerId: string, dto: CreateOrderDto) {
    const business = await this.prisma.business.findUnique({
      where: { id: dto.businessId },
      include: { area: true },
    });
    if (!business) throw new NotFoundException('المنشأة غير موجودة');

    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, businessId: dto.businessId },
    });
    if (products.length !== productIds.length) {
      throw new BadRequestException('بعض المنتجات غير صالحة لهذه المنشأة');
    }

    const priceOf = new Map(products.map((p) => [p.id, p.price]));
    let subtotal = new Prisma.Decimal(0);
    const itemData = dto.items.map((i) => {
      const unitPrice = priceOf.get(i.productId)!;
      subtotal = subtotal.add(unitPrice.mul(i.quantity));
      return { productId: i.productId, quantity: i.quantity, unitPrice };
    });
    const total = subtotal.add(business.area.deliveryFee);

    return this.prisma.order.create({
      data: {
        customerId,
        businessId: dto.businessId,
        status: OrderStatus.PENDING,
        paymentMethod: dto.paymentMethod,
        total,
        note: dto.note ?? null,
        items: { create: itemData },
        statusHistory: { create: { status: OrderStatus.PENDING, changedBy: customerId } },
      },
      include: ORDER_INCLUDE,
    });
  }

  async findForUser(user: AuthUser) {
    const where = await this.scopeFor(user);
    return this.prisma.order.findMany({ where, include: ORDER_INCLUDE, orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string, user: AuthUser) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: ORDER_INCLUDE });
    if (!order) throw new NotFoundException('الطلب غير موجود');
    await this.assertCanView(order, user);
    return order;
  }

  async updateStatus(id: string, user: AuthUser, dto: UpdateStatusDto) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { business: true } });
    if (!order) throw new NotFoundException('الطلب غير موجود');

    const from = order.status as OrderStatus;
    if (!canTransition(from, dto.status)) {
      throw new BadRequestException(`لا يمكن الانتقال من ${from} إلى ${dto.status}`);
    }
    await this.assertCanTransition(order, user, dto.status);

    return this.prisma.order.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.driverId ? { driverId: dto.driverId } : {}),
        statusHistory: { create: { status: dto.status, changedBy: user.id } },
      },
      include: ORDER_INCLUDE,
    });
  }

  // --- authorization helpers ---

  private async scopeFor(user: AuthUser): Promise<Prisma.OrderWhereInput> {
    switch (user.role) {
      case UserRole.CUSTOMER:
        return { customerId: user.id };
      case UserRole.BUSINESS: {
        const business = await this.prisma.business.findUnique({ where: { ownerId: user.id } });
        return { businessId: business?.id ?? '__none__' };
      }
      case UserRole.DRIVER: {
        const driver = await this.prisma.driver.findUnique({ where: { userId: user.id } });
        return { driverId: driver?.id ?? '__none__' };
      }
      case UserRole.ADMIN:
        return {};
    }
  }

  private async assertCanView(
    order: { customerId: string; businessId: string; driverId: string | null },
    user: AuthUser,
  ) {
    if (user.role === UserRole.ADMIN) return;
    if (user.role === UserRole.CUSTOMER && order.customerId === user.id) return;
    if (user.role === UserRole.BUSINESS) {
      const business = await this.prisma.business.findUnique({ where: { ownerId: user.id } });
      if (business && business.id === order.businessId) return;
    }
    if (user.role === UserRole.DRIVER && order.driverId) {
      const driver = await this.prisma.driver.findUnique({ where: { userId: user.id } });
      if (driver && driver.id === order.driverId) return;
    }
    throw new ForbiddenException('لا تملك صلاحية عرض هذا الطلب');
  }

  /**
   * Who may drive which transition:
   * - CONFIRMED/PREPARING/READY/CANCELLED(by business) → business owner
   * - PICKED_UP/DELIVERED → assigned driver
   * - CANCELLED → customer (only while PENDING) or business
   */
  private async assertCanTransition(
    order: { customerId: string; businessId: string; driverId: string | null; status: string },
    user: AuthUser,
    to: OrderStatus,
  ) {
    if (user.role === UserRole.ADMIN) return;

    if ([OrderStatus.PICKED_UP, OrderStatus.DELIVERED].includes(to)) {
      const driver = await this.prisma.driver.findUnique({ where: { userId: user.id } });
      if (user.role === UserRole.DRIVER && driver && driver.id === order.driverId) return;
      throw new ForbiddenException('فقط السائق المعيّن يمكنه تنفيذ هذا الإجراء');
    }

    if (to === OrderStatus.CANCELLED && user.role === UserRole.CUSTOMER) {
      if (order.customerId === user.id && order.status === OrderStatus.PENDING) return;
      throw new ForbiddenException('يمكن إلغاء الطلب فقط قبل تأكيده');
    }

    if (user.role === UserRole.BUSINESS) {
      const business = await this.prisma.business.findUnique({ where: { ownerId: user.id } });
      if (business && business.id === order.businessId) return;
    }
    throw new ForbiddenException('لا تملك صلاحية تغيير حالة هذا الطلب');
  }
}

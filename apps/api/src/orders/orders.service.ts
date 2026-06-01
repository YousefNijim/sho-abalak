import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { OrderStatus, UserRole, DriverStatus, PaymentStatus } from '@shu/shared-types';
import { canTransition } from '@shu/utils';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/jwt.strategy';
import { PaymentsService } from '../payments/payments.service';
import { SocketGateway } from '../gateway/socket.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { AdminInterventionDto } from './dto/admin-intervention.dto';

const ORDER_INCLUDE = {
  items: { include: { product: true } },
  business: { include: { area: true, owner: { select: { phone: true, name: true } } } },
  customer: { include: { area: true } },
  driver: { include: { user: true, area: true } },
  statusHistory: { orderBy: { createdAt: 'asc' as const } },
  payment: true,
} satisfies Prisma.OrderInclude;

/** Customer-facing Arabic push copy for each order status (only statuses we notify on). */
const STATUS_PUSH_BODY: Partial<Record<OrderStatus, string>> = {
  [OrderStatus.CONFIRMED]: 'تم تأكيد طلبك ✅',
  [OrderStatus.PREPARING]: 'جاري تحضير طلبك 👨‍🍳',
  [OrderStatus.READY]: 'طلبك جاهز 🛍️',
  [OrderStatus.PICKED_UP]: 'طلبك في الطريق إليك 🛵',
  [OrderStatus.DELIVERED]: 'تم تسليم طلبك، بالهنا والشفا 🎉',
  [OrderStatus.CANCELLED]: 'تم إلغاء طلبك',
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
    private readonly socketGateway: SocketGateway,
    private readonly notifications: NotificationsService,
  ) {}

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

    // Pre-generate the order id so the payment provider can reference it before we persist.
    const orderId = randomUUID();
    const { create: paymentCreate, checkout } = await this.payments.buildPaymentForOrder({
      orderId,
      method: dto.paymentMethod,
      amount: total,
    });

    const order = await this.prisma.order.create({
      data: {
        id: orderId,
        customerId,
        businessId: dto.businessId,
        status: OrderStatus.PENDING,
        paymentMethod: dto.paymentMethod,
        total,
        note: dto.note ?? null,
        deliveryAreaName: dto.deliveryAreaName ?? null,
        deliveryAddressDetail: dto.deliveryAddressDetail ?? null,
        items: { create: itemData },
        statusHistory: { create: { status: OrderStatus.PENDING, changedBy: customerId } },
        payment: { create: paymentCreate },
      },
      include: ORDER_INCLUDE,
    });

    // Emit new order socket event to the business owner
    if (order.business?.ownerId) {
      this.socketGateway.emitOrderNew(order.business.ownerId, order);
      // Push (additive to socket): notify the business that a new order arrived.
      void this.notifications.send(order.business.ownerId, {
        title: 'طلب جديد 🛎️',
        body: `لديك طلب جديد بقيمة ${Number(order.total)} ₪`,
        data: { type: 'order_new', orderId: order.id, role: 'business' },
      });
    }

    // For electronic orders the client needs the gateway checkout URL; cash returns null.
    return { ...order, checkout };
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
    await this.assertCanTransition(order, user, dto.status, dto.driverId);

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: {
          status: dto.status,
          ...(dto.driverId ? { driverId: dto.driverId } : {}),
          statusHistory: { create: { status: dto.status, changedBy: user.id } },
        },
      });

      // If transitioning to PICKED_UP, toggle the assigned driver to BUSY
      if (dto.status === OrderStatus.PICKED_UP && dto.driverId) {
        await tx.driver.update({
          where: { id: dto.driverId },
          data: { status: DriverStatus.BUSY },
        });
      }

      // If transitioning to DELIVERED, toggle the driver status back to AVAILABLE
      if (dto.status === OrderStatus.DELIVERED && order.driverId) {
        await tx.driver.update({
          where: { id: order.driverId },
          data: { status: DriverStatus.AVAILABLE },
        });
      }

      // Cash is collected on delivery → settle the payment to PAID in the same transaction.
      if (dto.status === OrderStatus.DELIVERED) {
        await this.payments.settleCashOnDelivery(id, tx);
      }

      // Re-read with includes AFTER settlement so the response carries the fresh payment status.
      return tx.order.findUniqueOrThrow({ where: { id }, include: ORDER_INCLUDE });
    });

    // Emit order status update to customer tracking room
    this.socketGateway.emitOrderStatusUpdate(updatedOrder.customerId, updatedOrder.id, updatedOrder.status as OrderStatus);

    // Push (additive): notify the customer of the new status.
    this.pushOrderStatusToCustomer(updatedOrder.customerId, updatedOrder.id, updatedOrder.status as OrderStatus);

    // Also emit order status update to the business owner so their app reflects changes (e.g. DELIVERED)
    if (updatedOrder.business?.ownerId) {
      this.socketGateway.emitOrderStatusUpdateToBusiness(updatedOrder.business.ownerId, updatedOrder.id, updatedOrder.status as OrderStatus);
    }

    // driver:request is intentionally NOT emitted here.
    // The two-step dispatch flow is: sendDriverRequest (emits the alert) → driver accepts via
    // acceptDriver (READY→PICKED_UP). updateStatus is for business status transitions
    // (CONFIRMED/PREPARING/READY) only; it does not dispatch drivers.

    return updatedOrder;
  }

  /**
   * Business sends a delivery request to a driver — order stays READY, no assignment yet.
   * The driver must accept before the order is assigned.
   */
  async sendDriverRequest(id: string, user: AuthUser, driverId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { business: true, customer: { include: { area: true } } },
    });
    if (!order) throw new NotFoundException('الطلب غير موجود');
    if (order.status !== OrderStatus.READY) {
      throw new BadRequestException('يمكن إرسال طلب للسائق فقط عندما يكون الطلب جاهزاً');
    }
    await this.assertOwnsOrderBusiness(order.businessId, user);

    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: { user: true },
    });
    if (!driver) throw new NotFoundException('السائق غير موجود');
    if (driver.status !== DriverStatus.AVAILABLE) {
      throw new BadRequestException('السائق غير متاح حالياً');
    }

    // Store which driver was sent the request (no assignment yet)
    await this.prisma.order.update({
      where: { id },
      data: { pendingDriverId: driverId },
    });

    // Emit request to driver's socket room — include full delivery address snapshot
    this.socketGateway.emitDriverRequest(driver.user.id, {
      orderId: order.id,
      businessName: order.business?.name || 'منشأة تجارية',
      areaName: order.deliveryAreaName || order.customer?.area?.name || 'العنوان المسجل',
      addressDetail: order.deliveryAddressDetail || '',
      total: Number(order.total),
    });
    // Push (additive): wake the selected driver even if their app is closed.
    this.pushDriverRequest(driver.user.id, order.id, order.business?.name);

    return { message: 'تم إرسال الطلب للسائق، بانتظار القبول' };
  }

  /**
   * Driver accepts a pending request — order transitions READY → PICKED_UP with assignment.
   */
  async acceptDriver(id: string, user: AuthUser) {
    if (user.role !== UserRole.DRIVER) {
      throw new ForbiddenException('فقط السائق يمكنه قبول الطلب');
    }

    const driver = await this.prisma.driver.findUnique({ where: { userId: user.id } });
    if (!driver) throw new ForbiddenException('لم يتم العثور على ملف السائق');

    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { business: true, customer: { include: { area: true } } },
    });
    if (!order) throw new NotFoundException('الطلب غير موجود');
    if (order.pendingDriverId !== driver.id) {
      throw new ForbiddenException('هذا الطلب لم يُرسل إليك');
    }
    if (order.status !== OrderStatus.READY) {
      throw new BadRequestException('هذا الطلب لم يعد متاحاً للقبول');
    }

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.PICKED_UP,
          driverId: driver.id,
          pendingDriverId: null,
          statusHistory: { create: { status: OrderStatus.PICKED_UP, changedBy: user.id } },
        },
      });

      await tx.driver.update({
        where: { id: driver.id },
        data: { status: DriverStatus.BUSY },
      });

      return tx.order.findUniqueOrThrow({ where: { id }, include: ORDER_INCLUDE });
    });

    // Notify customer and business
    this.socketGateway.emitOrderStatusUpdate(updatedOrder.customerId, updatedOrder.id, OrderStatus.PICKED_UP);
    this.pushOrderStatusToCustomer(updatedOrder.customerId, updatedOrder.id, OrderStatus.PICKED_UP);
    if (updatedOrder.business?.ownerId) {
      this.socketGateway.emitOrderStatusUpdateToBusiness(updatedOrder.business.ownerId, updatedOrder.id, OrderStatus.PICKED_UP);
    }

    return updatedOrder;
  }

  // --- push helpers (additive to socket emits; never throw) ---

  /** Notify the customer of an order status change via FCM (if we have copy for it). */
  private pushOrderStatusToCustomer(customerId: string, orderId: string, status: OrderStatus) {
    const body = STATUS_PUSH_BODY[status];
    if (!body) return;
    void this.notifications.send(customerId, {
      title: 'تحديث طلبك',
      body,
      data: { type: 'order_status', orderId, status, role: 'customer' },
    });
  }

  /** Notify a driver that they have a new delivery request. */
  private pushDriverRequest(driverUserId: string, orderId: string, businessName?: string | null) {
    void this.notifications.send(driverUserId, {
      title: 'طلب توصيل جديد 🛵',
      body: businessName ? `طلب توصيل جديد من ${businessName}` : 'لديك طلب توصيل جديد',
      data: { type: 'driver_request', orderId, role: 'driver' },
    });
  }

  async rejectDriver(id: string, user: AuthUser) {
    if (user.role !== UserRole.DRIVER) {
      throw new ForbiddenException('فقط السائق يمكنه رفض الطلب');
    }

    const driver = await this.prisma.driver.findUnique({ where: { userId: user.id }, include: { user: true } });
    if (!driver) throw new ForbiddenException('لم يتم العثور على ملف السائق');

    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { business: true },
    });

    if (!order) throw new NotFoundException('الطلب غير موجود');

    // Handle rejection of a pending request (READY status, pendingDriverId set)
    if (order.status === OrderStatus.READY && order.pendingDriverId === driver.id) {
      await this.prisma.order.update({
        where: { id },
        data: { pendingDriverId: null },
      });

      if (order.business?.ownerId) {
        this.socketGateway.emitOrderDriverRejected(order.business.ownerId, {
          orderId: order.id,
          driverName: driver.user?.name ?? 'سائق',
        });
      }
      // Re-read with full includes for a consistent response shape
      return this.prisma.order.findUniqueOrThrow({ where: { id }, include: ORDER_INCLUDE });
    }

    // Legacy path: driver was already assigned (PICKED_UP) and wants to cancel
    if (!order.driverId || order.driverId !== driver.id) {
      throw new ForbiddenException('أنت غير معين لهذا الطلب أو الطلب غير مسند لأي سائق');
    }

    if (order.status !== OrderStatus.PICKED_UP) {
      throw new BadRequestException('لا يمكن رفض هذا الطلب في حالته الحالية');
    }

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.READY,
          driverId: null,
          pendingDriverId: null,
          statusHistory: { create: { status: OrderStatus.READY, changedBy: user.id } },
        },
      });

      await tx.driver.update({
        where: { id: driver.id },
        data: { status: DriverStatus.AVAILABLE },
      });

      return tx.order.findUniqueOrThrow({ where: { id }, include: ORDER_INCLUDE });
    });

    if (updatedOrder.business?.ownerId) {
      this.socketGateway.emitOrderDriverRejected(updatedOrder.business.ownerId, {
        orderId: updatedOrder.id,
        driverName: driver.user?.name ?? 'سائق',
      });
    }
    this.socketGateway.emitOrderStatusUpdate(updatedOrder.customerId, updatedOrder.id, OrderStatus.READY);

    return updatedOrder;
  }

  async adminIntervention(id: string, user: AuthUser, dto: AdminInterventionDto) {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('فقط المشرف يمكنه استخدام هذا الإجراء');
    }

    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { business: true, payment: true },
    });
    if (!order) throw new NotFoundException('الطلب غير موجود');

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      // 1. Handle driver reassignment / unassignment
      let nextDriverId = order.driverId;
      let nextPendingDriverId = order.pendingDriverId;

      if (dto.driverId !== undefined) {
        if (dto.driverId === null) {
          // Unassign driver
          if (order.driverId) {
            await tx.driver.update({
              where: { id: order.driverId },
              data: { status: DriverStatus.AVAILABLE },
            });
          }
          nextDriverId = null;
          nextPendingDriverId = null;
        } else {
          // Assign driver
          const driverExists = await tx.driver.findUnique({ where: { id: dto.driverId } });
          if (!driverExists) throw new NotFoundException('السائق غير موجود');

          // Release previous driver if assigned
          if (order.driverId && order.driverId !== dto.driverId) {
            await tx.driver.update({
              where: { id: order.driverId },
              data: { status: DriverStatus.AVAILABLE },
            });
          }

          nextDriverId = dto.driverId;
          nextPendingDriverId = null;

          // Set the new driver to BUSY if final status is PICKED_UP
          const finalStatus = dto.status !== undefined ? dto.status : (order.status as OrderStatus);
          if (finalStatus === OrderStatus.PICKED_UP) {
            await tx.driver.update({
              where: { id: dto.driverId },
              data: { status: DriverStatus.BUSY },
            });
          }
        }
      }

      // 2. Handle order status override
      let finalStatus = order.status as OrderStatus;
      if (dto.status !== undefined) {
        finalStatus = dto.status;
      }

      // If status changed to PICKED_UP and we have a driver, set driver to BUSY
      if (dto.status === OrderStatus.PICKED_UP && nextDriverId) {
        await tx.driver.update({
          where: { id: nextDriverId },
          data: { status: DriverStatus.BUSY },
        });
      }

      // If status changed to DELIVERED and we have a driver, set driver to AVAILABLE
      if (dto.status === OrderStatus.DELIVERED && nextDriverId) {
        await tx.driver.update({
          where: { id: nextDriverId },
          data: { status: DriverStatus.AVAILABLE },
        });
      }

      // If status changed to DELIVERED and cash payment, settle cash payment to PAID
      if (dto.status === OrderStatus.DELIVERED) {
        await this.payments.settleCashOnDelivery(id, tx);
      }

      // 3. Update the Order table row
      await tx.order.update({
        where: { id },
        data: {
          status: finalStatus,
          driverId: nextDriverId,
          pendingDriverId: nextPendingDriverId,
          ...(dto.status !== undefined
            ? {
                statusHistory: {
                  create: {
                    status: dto.status,
                    changedBy: `ADMIN:${user.name} (${user.id})`,
                  },
                },
              }
            : {}),
        },
      });

      // 4. Handle payment status override
      if (dto.paymentStatus !== undefined && order.payment) {
        await tx.payment.update({
          where: { orderId: id },
          data: { status: dto.paymentStatus },
        });
      }

      return tx.order.findUniqueOrThrow({ where: { id }, include: ORDER_INCLUDE });
    });

    // 5. Emit socket events to keep clients updated in real time
    this.socketGateway.emitOrderStatusUpdate(updatedOrder.customerId, updatedOrder.id, updatedOrder.status as OrderStatus);

    // Push (additive): notify the customer if the admin changed the status.
    if (dto.status !== undefined) {
      this.pushOrderStatusToCustomer(updatedOrder.customerId, updatedOrder.id, updatedOrder.status as OrderStatus);
    }

    if (updatedOrder.business?.ownerId) {
      this.socketGateway.emitOrderStatusUpdateToBusiness(updatedOrder.business.ownerId, updatedOrder.id, updatedOrder.status as OrderStatus);
    }

    // Only dispatch a driver:request alert when the admin is explicitly assigning
    // the order to a driver (setting status to PICKED_UP). Any other admin action
    // (adjusting payment, reassigning driver without a status change, etc.) must
    // NOT send the driver a spurious new-request alert.
    if (dto.status === OrderStatus.PICKED_UP && updatedOrder.driver?.user?.id) {
      this.socketGateway.emitDriverRequest(updatedOrder.driver.user.id, {
        orderId: updatedOrder.id,
        businessName: updatedOrder.business?.name || 'منشأة تجارية',
        areaName: updatedOrder.deliveryAreaName || updatedOrder.customer?.area?.name || 'العنوان المسجل',
        addressDetail: updatedOrder.deliveryAddressDetail || '',
        total: Number(updatedOrder.total),
      });
      this.pushDriverRequest(updatedOrder.driver.user.id, updatedOrder.id, updatedOrder.business?.name);
    }

    return updatedOrder;
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
   * Who may drive which transition (matches FRONTEND_DESIGN.md flows):
   * - CONFIRMED / PREPARING / READY → business owner.
   * - PICKED_UP → business owner assigns the driver (the "اختيار سائق" screen lives in the
   *   business app); a `driverId` must be provided so the order gets an assignee.
   * - DELIVERED → the assigned driver only (the "تم التسليم" button in the driver app).
   * - CANCELLED → the customer (only while still PENDING) or the business owner.
   */
  private async assertCanTransition(
    order: { customerId: string; businessId: string; driverId: string | null; status: string },
    user: AuthUser,
    to: OrderStatus,
    driverId?: string,
  ) {
    if (user.role === UserRole.ADMIN) return;

    // Final delivery — assigned driver only.
    if (to === OrderStatus.DELIVERED) {
      const driver = await this.prisma.driver.findUnique({ where: { userId: user.id } });
      if (user.role === UserRole.DRIVER && driver && driver.id === order.driverId) return;
      throw new ForbiddenException('فقط السائق المعيّن يمكنه تأكيد التسليم');
    }

    // Assigning a driver — business owner, must supply a driverId.
    if (to === OrderStatus.PICKED_UP) {
      if (!driverId) throw new BadRequestException('يجب تحديد السائق عند تعيين الطلب');
      await this.assertOwnsOrderBusiness(order.businessId, user);
      return;
    }

    // Cancellation by the customer — only before the business confirms.
    if (to === OrderStatus.CANCELLED && user.role === UserRole.CUSTOMER) {
      if (order.customerId === user.id && order.status === OrderStatus.PENDING) return;
      throw new ForbiddenException('يمكن إلغاء الطلب فقط قبل تأكيده');
    }

    // Everything else (CONFIRMED/PREPARING/READY, or business-side CANCELLED) — business owner.
    await this.assertOwnsOrderBusiness(order.businessId, user);
  }

  /** Confirms the current user is the BUSINESS owner of the order's business. */
  private async assertOwnsOrderBusiness(businessId: string, user: AuthUser) {
    if (user.role === UserRole.BUSINESS) {
      const business = await this.prisma.business.findUnique({ where: { ownerId: user.id } });
      if (business && business.id === businessId) return;
    }
    throw new ForbiddenException('لا تملك صلاحية تغيير حالة هذا الطلب');
  }
}

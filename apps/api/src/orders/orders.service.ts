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
  review: true,
  driverReview: true,
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
      where: { id: { in: productIds }, businessId: dto.businessId, isAvailable: true },
    });
    if (products.length !== productIds.length) {
      throw new BadRequestException('بعض المنتجات غير متوفرة حالياً');
    }

    const priceOf = new Map(products.map((p) => [p.id, p.price]));
    let subtotal = new Prisma.Decimal(0);
    const itemData = dto.items.map((i) => {
      const unitPrice = priceOf.get(i.productId)!;
      subtotal = subtotal.add(unitPrice.mul(i.quantity));
      return { productId: i.productId, quantity: i.quantity, unitPrice };
    });

    // Minimum order check
    if (business.minimumOrder && subtotal.lt(business.minimumOrder)) {
      throw new BadRequestException(`الحد الأدنى للطلب من هذه المنشأة هو ${business.minimumOrder} ₪`);
    }

    // Coupon validation & discount
    let couponDiscount = new Prisma.Decimal(0);
    let couponCode: string | null = null;
    let couponIssuedBy: string | null = null;
    let couponId: string | null = null;
    if (dto.couponCode) {
      const code = dto.couponCode.toUpperCase().trim();
      const coupon = await this.prisma.coupon.findUnique({ where: { code } });
      if (!coupon || !coupon.isActive) {
        throw new BadRequestException('كود الكوبون غير صحيح أو غير فعّال');
      }
      if (coupon.maxUses !== null && coupon.currentUses >= coupon.maxUses) {
        throw new BadRequestException('تم الوصول للحد الأقصى لمرات استخدام هذا الكوبون');
      }
      if (coupon.maxTotalDiscount !== null && Number(coupon.currentTotalDiscount) >= Number(coupon.maxTotalDiscount)) {
        throw new BadRequestException('تم الوصول للحد الأقصى لقيمة الخصم الإجمالية لهذا الكوبون');
      }
      if (subtotal.lt(coupon.minimumOrder)) {
        throw new BadRequestException(`الحد الأدنى لاستخدام هذا الكوبون هو ${coupon.minimumOrder} ₪`);
      }
      // Compute discount based on type (FIXED or PERCENTAGE with maxDiscount cap)
      if (coupon.discountType === 'PERCENTAGE') {
        const pct = (coupon.discountPct ?? new Prisma.Decimal(0)).div(100);
        const raw = subtotal.mul(pct);
        const max = coupon.maxDiscount ?? new Prisma.Decimal(999999);
        couponDiscount = Prisma.Decimal.min(raw, max, subtotal);
      } else {
        couponDiscount = Prisma.Decimal.min(coupon.discountAmount, subtotal);
      }
      
      // Cap the discount if maxTotalDiscount limit is close
      if (coupon.maxTotalDiscount !== null) {
        const remainingDiscount = new Prisma.Decimal(coupon.maxTotalDiscount).sub(coupon.currentTotalDiscount);
        if (couponDiscount.gt(remainingDiscount)) {
          couponDiscount = remainingDiscount;
        }
      }

      couponCode = code;
      couponIssuedBy = coupon.issuedBy;
      couponId = coupon.id;
    }

    const deliveryFee = business.area.deliveryFee;
    const driverDeliveryFee = (business.area as any).driverDeliveryFee ?? new Prisma.Decimal(0);
    const platformDeliveryFee = deliveryFee.sub(driverDeliveryFee);
    const subtotalAfterCoupon = subtotal.sub(couponDiscount);
    const total = subtotalAfterCoupon.add(deliveryFee);

    // Pre-generate the order id so the payment provider can reference it before we persist.
    const orderId = randomUUID();
    const { create: paymentCreate, checkout } = await this.payments.buildPaymentForOrder({
      orderId,
      method: dto.paymentMethod,
      amount: total,
    });

    const order = await this.prisma.$transaction(async (tx) => {
      // Increment coupon usage atomically with order creation
      if (couponId) {
        await tx.coupon.update({
          where: { id: couponId },
          data: { 
            currentUses: { increment: 1 },
            currentTotalDiscount: { increment: couponDiscount }
          },
        });
      }
      return tx.order.create({
        data: {
          id: orderId,
          customerId,
          businessId: dto.businessId,
          status: OrderStatus.PENDING,
          paymentMethod: dto.paymentMethod,
          subtotal,
          couponDiscount,
          deliveryFee,
          driverDeliveryFee,
          platformDeliveryFee,
          total,
          couponCode,
          couponIssuedBy,
          note: dto.note ?? null,
          deliveryAreaName: dto.deliveryAreaName ?? null,
          deliveryAddressDetail: dto.deliveryAddressDetail ?? null,
          items: { create: itemData },
          statusHistory: { create: { status: OrderStatus.PENDING, changedBy: customerId } },
          payment: { create: paymentCreate },
        },
        include: ORDER_INCLUDE,
      });
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

      // If transitioning to DELIVERED, toggle the driver status back to AVAILABLE and update balance if CASH
      if (dto.status === OrderStatus.DELIVERED && order.driverId) {
        await tx.driver.update({
          where: { id: order.driverId },
          data: {
            status: DriverStatus.AVAILABLE,
            ...(order.paymentMethod === 'CASH' ? {
              platformBalance: { increment: order.driverDeliveryFee }
            } : {})
          },
        });
      }

      // Cash is collected on delivery → settle the payment to PAID in the same transaction.
      if (dto.status === OrderStatus.DELIVERED) {
        // Calculate the platform commission from the subtotal
        const commission = new Prisma.Decimal(order.subtotal).mul(order.business.commissionRate).div(new Prisma.Decimal(100));
        await tx.business.update({
          where: { id: order.businessId },
          data: {
            platformBalance: { increment: commission }
          }
        });

        await this.payments.settleCashOnDelivery(id, tx);
      }

      // If cancelling an order that already has a driver assigned, free the driver.
      if (dto.status === OrderStatus.CANCELLED) {
        if (order.driverId) {
          const postPickup = [OrderStatus.PICKED_UP, OrderStatus.DELIVERED].includes(from);
          if (postPickup) {
            await tx.driver.update({
              where: { id: order.driverId },
              data: { status: DriverStatus.AVAILABLE },
            });
          }
        }
        if (order.pendingDriverId) {
          await tx.order.update({
            where: { id },
            data: { pendingDriverId: null },
          });
        }
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
   * Business sends a batch delivery request to a driver.
   * All orders must be READY, belong to the same business, and have delivery
   * addresses in the same city. A shared batchId is stamped on every order so
   * accept/reject can operate atomically on the whole group.
   *
   * Backwards-compatible: passing a single orderId still works exactly as before.
   */
  async sendDriverRequest(orderIds: string[], user: AuthUser, driverId: string) {
    if (!orderIds || orderIds.length === 0) {
      throw new BadRequestException('يجب تحديد طلب واحد على الأقل');
    }

    const orders = await this.prisma.order.findMany({
      where: { id: { in: orderIds } },
      include: { business: true, customer: { include: { area: true } }, items: { include: { product: true } } },
    });

    if (orders.length !== orderIds.length) {
      throw new NotFoundException('بعض الطلبات غير موجودة');
    }

    // All must be READY
    const notReady = orders.filter((o) => o.status !== OrderStatus.READY);
    if (notReady.length > 0) {
      throw new BadRequestException('جميع الطلبات يجب أن تكون في حالة جاهز للإرسال');
    }

    // All must belong to the same business
    const firstBusinessId = orders[0].businessId;
    await this.assertOwnsOrderBusiness(firstBusinessId, user);
    if (orders.some((o) => o.businessId !== firstBusinessId)) {
      throw new BadRequestException('يجب أن تكون جميع الطلبات من نفس المنشأة');
    }

    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: { user: true },
    });
    if (!driver) throw new NotFoundException('السائق غير موجود');
    if (driver.status !== DriverStatus.AVAILABLE) {
      throw new BadRequestException('السائق غير متاح حالياً');
    }

    // Stamp all orders with the same batchId and pendingDriverId
    const batchId = randomUUID();
    await this.prisma.order.updateMany({
      where: { id: { in: orderIds } },
      data: { pendingDriverId: driverId, batchId },
    });

    // Build per-order payload for the driver's alert screen
    const orderPayloads = orders.map((o) => ({
      orderId: o.id,
      businessName: o.business?.name || 'منشأة تجارية',
      areaName: o.deliveryAreaName || o.customer?.area?.name || 'العنوان المسجل',
      addressDetail: o.deliveryAddressDetail || '',
      subtotal: Number(o.subtotal),
      couponDiscount: Number(o.couponDiscount),
      deliveryFee: Number(o.deliveryFee),
      total: Number(o.total),
      items: (o.items || []).map((it) => ({
        name: it.product?.name || '',
        quantity: it.quantity,
      })),
    }));

    this.socketGateway.emitDriverRequest(driver.user.id, { batchId, orders: orderPayloads });

    // FCM push — summarise the batch
    const businessName = orders[0].business?.name;
    const pushBody = orders.length > 1
      ? `${orders.length} طلبات توصيل من ${businessName || 'منشأة تجارية'}`
      : `طلب توصيل من ${businessName || 'منشأة تجارية'}`;
    void this.notifications.send(driver.user.id, {
      title: 'طلب توصيل جديد 🛵',
      body: pushBody,
      data: { type: 'driver_request', orderId: orders[0].id, batchId, role: 'driver' },
    });

    return { message: 'تم إرسال الطلب للسائق، بانتظار القبول', batchId };
  }

  /**
   * Driver accepts a pending request.
   * If the order is part of a batch (batchId set), ALL orders in that batch are
   * transitioned to PICKED_UP atomically and the driver is marked BUSY once.
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

    // Collect all orders in the batch (may be just this one)
    const batchOrders = order.batchId
      ? await this.prisma.order.findMany({
          where: { batchId: order.batchId, pendingDriverId: driver.id, status: OrderStatus.READY },
          include: { business: true },
        })
      : [order];

    const updatedOrders = await this.prisma.$transaction(async (tx) => {
      const ids = batchOrders.map((o) => o.id);

      await tx.order.updateMany({
        where: { id: { in: ids } },
        data: { status: OrderStatus.PICKED_UP, driverId: driver.id, pendingDriverId: null },
      });

      // Create status history entries for each order
      await tx.orderStatusHistory.createMany({
        data: ids.map((oid) => ({ orderId: oid, status: OrderStatus.PICKED_UP, changedBy: user.id })),
      });

      await tx.driver.update({
        where: { id: driver.id },
        data: { status: DriverStatus.BUSY },
      });

      return tx.order.findMany({ where: { id: { in: ids } }, include: ORDER_INCLUDE });
    });

    // Notify customers and businesses for every order in the batch
    for (const o of updatedOrders) {
      this.socketGateway.emitOrderStatusUpdate(o.customerId, o.id, OrderStatus.PICKED_UP);
      this.pushOrderStatusToCustomer(o.customerId, o.id, OrderStatus.PICKED_UP);
      if (o.business?.ownerId) {
        this.socketGateway.emitOrderStatusUpdateToBusiness(o.business.ownerId, o.id, OrderStatus.PICKED_UP);
      }
    }

    return updatedOrders;
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

    // Rejection of a pending batch (READY status, pendingDriverId set)
    if (order.status === OrderStatus.READY && order.pendingDriverId === driver.id) {
      // Clear pendingDriverId (and batchId) on the whole batch
      const batchWhere = order.batchId
        ? { batchId: order.batchId, pendingDriverId: driver.id }
        : { id };

      const batchOrders = await this.prisma.order.findMany({
        where: batchWhere,
        include: { business: true },
      });

      await this.prisma.order.updateMany({
        where: batchWhere,
        data: { pendingDriverId: null, batchId: null },
      });

      // Notify each business owner (may be the same owner for all orders)
      const notifiedOwners = new Set<string>();
      for (const o of batchOrders) {
        if (o.business?.ownerId && !notifiedOwners.has(o.business.ownerId)) {
          this.socketGateway.emitOrderDriverRejected(o.business.ownerId, {
            orderId: o.id,
            driverName: driver.user?.name ?? 'سائق',
          });
          notifiedOwners.add(o.business.ownerId);
        }
      }

      return this.prisma.order.findUniqueOrThrow({ where: { id }, include: ORDER_INCLUDE });
    }

    // Driver cancels an already-assigned batch (PICKED_UP)
    if (!order.driverId || order.driverId !== driver.id) {
      throw new ForbiddenException('أنت غير معين لهذا الطلب أو الطلب غير مسند لأي سائق');
    }
    if (order.status !== OrderStatus.PICKED_UP) {
      throw new BadRequestException('لا يمكن رفض هذا الطلب في حالته الحالية');
    }

    const batchOrders = order.batchId
      ? await this.prisma.order.findMany({
          where: { batchId: order.batchId, driverId: driver.id, status: OrderStatus.PICKED_UP },
          include: { business: true },
        })
      : [order];

    const updatedOrders = await this.prisma.$transaction(async (tx) => {
      const ids = batchOrders.map((o) => o.id);

      await tx.order.updateMany({
        where: { id: { in: ids } },
        data: { status: OrderStatus.READY, driverId: null, pendingDriverId: null, batchId: null },
      });

      await tx.orderStatusHistory.createMany({
        data: ids.map((oid) => ({ orderId: oid, status: OrderStatus.READY, changedBy: user.id })),
      });

      await tx.driver.update({
        where: { id: driver.id },
        data: { status: DriverStatus.AVAILABLE },
      });

      return tx.order.findMany({ where: { id: { in: ids } }, include: ORDER_INCLUDE });
    });

    const notifiedOwners = new Set<string>();
    for (const o of updatedOrders) {
      this.socketGateway.emitOrderStatusUpdate(o.customerId, o.id, OrderStatus.READY);
      if (o.business?.ownerId && !notifiedOwners.has(o.business.ownerId)) {
        this.socketGateway.emitOrderDriverRejected(o.business.ownerId, {
          orderId: o.id,
          driverName: driver.user?.name ?? 'سائق',
        });
        notifiedOwners.add(o.business.ownerId);
      }
    }

    return updatedOrders[0];
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

      // If status changed to DELIVERED and we have a driver, set driver to AVAILABLE and update balance if CASH
      if (dto.status === OrderStatus.DELIVERED && nextDriverId) {
        await tx.driver.update({
          where: { id: nextDriverId },
          data: {
            status: DriverStatus.AVAILABLE,
            ...(order.paymentMethod === 'CASH' ? {
              platformBalance: { increment: order.driverDeliveryFee }
            } : {})
          },
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
        batchId: updatedOrder.batchId ?? randomUUID(),
        orders: [{
          orderId: updatedOrder.id,
          businessName: updatedOrder.business?.name || 'منشأة تجارية',
          areaName: updatedOrder.deliveryAreaName || (updatedOrder as any).customer?.area?.name || 'العنوان المسجل',
          addressDetail: updatedOrder.deliveryAddressDetail || '',
          total: Number(updatedOrder.total),
          items: ((updatedOrder as any).items || []).map((it: any) => ({ name: it.product?.name || '', quantity: it.quantity })),
        }],
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
        const id = driver?.id ?? '__none__';
        return { OR: [{ driverId: id }, { pendingDriverId: id }] };
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

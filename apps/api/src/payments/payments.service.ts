import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaymentMethod, PaymentStatus } from '@shu/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { PAYMENT_PROVIDER, PaymentProvider } from './providers/payment-provider.interface';

/** Returned to the client when an ELECTRONIC order is created (null for cash). */
export interface CheckoutInfo {
  checkoutUrl?: string;
  reference: string;
  provider: string;
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  /**
   * Builds the Payment to nest inside the order's `create` (keeps order+payment atomic).
   * - CASH → PENDING, no gateway. Settles to PAID on delivery (see `settleCashOnDelivery`).
   * - ELECTRONIC → opens a gateway checkout, stores its reference, stays PENDING until confirmed.
   * Returns the nested-create payload plus any checkout info to hand back to the client.
   */
  async buildPaymentForOrder(input: {
    orderId: string;
    method: PaymentMethod;
    amount: Prisma.Decimal;
  }): Promise<{ create: Prisma.PaymentCreateWithoutOrderInput; checkout: CheckoutInfo | null }> {
    if (input.method === PaymentMethod.CASH) {
      return {
        create: { method: PaymentMethod.CASH, status: PaymentStatus.PENDING, amount: input.amount },
        checkout: null,
      };
    }

    const session = await this.provider.createCheckout({
      orderId: input.orderId,
      amount: input.amount.toNumber(),
    });
    return {
      create: {
        method: PaymentMethod.ELECTRONIC,
        status: PaymentStatus.PENDING,
        amount: input.amount,
        provider: session.provider,
        reference: session.reference,
      },
      checkout: { checkoutUrl: session.checkoutUrl, reference: session.reference, provider: session.provider },
    };
  }

  /** Cash collected on delivery → mark PAID. No-op for electronic (settled via confirm). */
  async settleCashOnDelivery(orderId: string, tx: Prisma.TransactionClient = this.prisma) {
    const payment = await tx.payment.findUnique({ where: { orderId } });
    if (payment && payment.method === PaymentMethod.CASH && payment.status === PaymentStatus.PENDING) {
      await tx.payment.update({ where: { orderId }, data: { status: PaymentStatus.PAID } });
    }
  }

  /**
   * Confirms an online payment from a gateway webhook / client confirm call.
   * Delegates outcome to the provider (which, for a real gateway, verifies a signature).
   */
  async confirmOnline(payload: Record<string, unknown>) {
    const result = await this.provider.verifyConfirmation(payload);
    if (!result.reference) throw new BadRequestException('مرجع الدفع مفقود');

    const payment = await this.prisma.payment.findUnique({ where: { reference: result.reference } });
    if (!payment) throw new NotFoundException('عملية الدفع غير موجودة');

    return this.prisma.payment.update({
      where: { reference: result.reference },
      data: { status: result.paid ? PaymentStatus.PAID : PaymentStatus.FAILED },
    });
  }

  findByOrder(orderId: string) {
    return this.prisma.payment.findUnique({ where: { orderId } });
  }
}

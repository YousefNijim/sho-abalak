import { Injectable } from '@nestjs/common';
import {
  CheckoutSession,
  ConfirmationResult,
  PaymentProvider,
} from './payment-provider.interface';

/**
 * Development stand-in for a real online gateway. No money moves.
 *
 * - `createCheckout` returns a fake reference + a local confirm URL.
 * - `verifyConfirmation` treats the payment as paid unless the caller explicitly
 *   sends `{ paid: false }` (lets us exercise the FAILED path too).
 *
 * Replace by binding a real PaymentProvider to PAYMENT_PROVIDER in PaymentsModule.
 */
@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';

  async createCheckout(input: { orderId: string; amount: number }): Promise<CheckoutSession> {
    const reference = `mock_${input.orderId}`;
    return {
      reference,
      checkoutUrl: `/payments/mock-checkout/${reference}`,
      provider: this.name,
    };
  }

  async verifyConfirmation(payload: Record<string, unknown>): Promise<ConfirmationResult> {
    return {
      reference: String(payload.reference ?? ''),
      paid: payload.paid !== false,
    };
  }
}

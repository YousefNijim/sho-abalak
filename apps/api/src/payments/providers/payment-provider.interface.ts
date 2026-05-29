/**
 * Abstraction over an online payment gateway.
 *
 * Cash payments never touch this — they settle when the driver collects on delivery.
 * For ELECTRONIC payments the app talks ONLY to this interface, so swapping the dev
 * MockProvider for a real gateway (e.g. a Palestinian PSP, Stripe, PayTabs) is a single
 * binding change in PaymentsModule — no service/controller rewrite.
 *
 * To add a real provider:
 *   1. implement this interface in `providers/<name>.provider.ts`
 *   2. bind it to PAYMENT_PROVIDER in PaymentsModule (e.g. switch on an env var)
 */
export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

export interface CheckoutSession {
  /** Provider-side identifier for this payment attempt (stored/looked up on confirm). */
  reference: string;
  /** URL the client opens to complete payment, if the provider is redirect-based. */
  checkoutUrl?: string;
  /** Provider name, for diagnostics/UI. */
  provider: string;
}

export interface ConfirmationResult {
  reference: string;
  /** Whether the gateway reports the payment as successfully captured. */
  paid: boolean;
}

export interface PaymentProvider {
  /** Starts an online payment for the given order/amount; returns where to send the client. */
  createCheckout(input: { orderId: string; amount: number }): Promise<CheckoutSession>;

  /**
   * Interprets a confirmation — either a gateway webhook body or a client-side confirm call —
   * and reports the outcome. Real providers MUST verify a signature here.
   */
  verifyConfirmation(payload: Record<string, unknown>): Promise<ConfirmationResult>;
}

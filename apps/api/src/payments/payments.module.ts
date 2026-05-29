import { forwardRef, Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PAYMENT_PROVIDER } from './providers/payment-provider.interface';
import { MockPaymentProvider } from './providers/mock.provider';
import { OrdersModule } from '../orders/orders.module';

@Module({
  // forwardRef: OrdersModule imports PaymentsModule too (orders create payments,
  // payments controller reuses order view-authz).
  imports: [forwardRef(() => OrdersModule)],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    // Swap this binding to a real gateway provider when going live.
    { provide: PAYMENT_PROVIDER, useClass: MockPaymentProvider },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}

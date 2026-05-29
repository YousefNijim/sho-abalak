import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/jwt.strategy';
import { OrdersService } from '../orders/orders.service';
import { PaymentsService } from './payments.service';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly orders: OrdersService,
  ) {}

  /**
   * Gateway confirmation / webhook for online payments. Public: a real gateway calls this
   * server-to-server and the provider verifies authenticity (signature) inside the service.
   */
  @Post('confirm')
  confirm(@Body() dto: ConfirmPaymentDto) {
    return this.payments.confirmOnline({ reference: dto.reference, paid: dto.paid });
  }

  /** Payment for an order — authorized by reusing the order's view check. */
  @Get(':orderId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async findByOrder(@Param('orderId') orderId: string, @CurrentUser() user: AuthUser) {
    await this.orders.findOne(orderId, user); // throws 403/404 if the caller may not view it
    return this.payments.findByOrder(orderId);
  }
}

import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@shu/shared-types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/jwt.strategy';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { AdminInterventionDto } from './dto/admin-intervention.dto';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.CUSTOMER, UserRole.BUSINESS)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto) {
    return this.orders.create(user.id, dto);
  }

  @Get()
  findMine(@CurrentUser() user: AuthUser, @Query('businessType') businessType?: 'FOOD' | 'STORE') {
    return this.orders.findForUser(user, businessType);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.orders.findOne(id, user);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: UpdateStatusDto) {
    return this.orders.updateStatus(id, user, dto);
  }

  /** Send one or more READY orders to a driver as a batch.
   *  Body: { orderIds: string[]; driverId: string }
   *  The :id param is ignored — kept for URL compatibility but orderIds is authoritative.
   */
  @Post('send-driver-request')
  @UseGuards(RolesGuard)
  @Roles(UserRole.BUSINESS)
  sendDriverRequest(
    @CurrentUser() user: AuthUser,
    @Body('orderIds') orderIds: string[],
    @Body('driverId') driverId: string,
  ) {
    return this.orders.sendDriverRequest(orderIds, user, driverId);
  }

  /** Legacy single-order route — wraps to batch with one element. */
  @Post(':id/send-driver-request')
  @UseGuards(RolesGuard)
  @Roles(UserRole.BUSINESS)
  sendDriverRequestLegacy(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body('driverId') driverId: string,
  ) {
    return this.orders.sendDriverRequest([id], user, driverId);
  }

  @Post(':id/accept-driver')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER)
  acceptDriver(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.orders.acceptDriver(id, user);
  }

  @Patch(':id/reject-driver')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER)
  rejectDriver(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.orders.rejectDriver(id, user);
  }

  @Patch(':id/admin-intervention')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  adminIntervention(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: AdminInterventionDto,
  ) {
    return this.orders.adminIntervention(id, user, dto);
  }
}

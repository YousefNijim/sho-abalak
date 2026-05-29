import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
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

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.CUSTOMER)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto) {
    return this.orders.create(user.id, dto);
  }

  @Get()
  findMine(@CurrentUser() user: AuthUser) {
    return this.orders.findForUser(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.orders.findOne(id, user);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: UpdateStatusDto) {
    return this.orders.updateStatus(id, user, dto);
  }

  @Patch(':id/reject-driver')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER)
  rejectDriver(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.orders.rejectDriver(id, user);
  }
}

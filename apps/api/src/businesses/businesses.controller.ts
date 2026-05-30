import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@shu/shared-types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/jwt.strategy';
import { BusinessesService } from './businesses.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { AdminCreateBusinessDto } from './dto/admin-create-business.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { QueryBusinessDto } from './dto/query-business.dto';

@ApiTags('businesses')
@Controller('businesses')
export class BusinessesController {
  constructor(private readonly businesses: BusinessesService) {}

  @Get()
  findAll(@Query() query: QueryBusinessDto) {
    return this.businesses.findAll(query);
  }

  @Get('mine')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS)
  findMine(@CurrentUser() user: AuthUser) {
    return this.businesses.findByOwner(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.businesses.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBusinessDto) {
    return this.businesses.create(user.id, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS)
  update(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: UpdateBusinessDto) {
    return this.businesses.update(id, user.id, dto);
  }

  @Patch(':id/admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  adminUpdate(@Param('id') id: string, @Body() dto: UpdateBusinessDto) {
    return this.businesses.adminUpdate(id, dto);
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  adminUpdateStatus(@Param('id') id: string, @Body('isOpen') isOpen: boolean) {
    return this.businesses.adminUpdateStatus(id, isOpen);
  }

  @Patch(':id/commission')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  adminUpdateCommission(@Param('id') id: string, @Body('commissionRate') commissionRate: number) {
    return this.businesses.adminUpdateCommission(id, commissionRate);
  }

  /** Admin creates a complete, immediately-active store (owner + password + business). */
  @Post('admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  adminCreate(@Body() dto: AdminCreateBusinessDto) {
    return this.businesses.adminCreate(dto);
  }

  /** Admin approves a pending store and sets its first password → owner becomes ACTIVE. */
  @Patch(':id/approve')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  adminApprove(@Param('id') id: string, @Body() dto: SetPasswordDto) {
    return this.businesses.adminApprove(id, dto.password);
  }

  /** Admin rejects (deletes) a still-pending registration. */
  @Delete(':id/reject')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  adminReject(@Param('id') id: string) {
    return this.businesses.adminReject(id);
  }

  /** Admin resets an existing store's password. */
  @Patch(':id/password')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  adminResetPassword(@Param('id') id: string, @Body() dto: SetPasswordDto) {
    return this.businesses.adminResetPassword(id, dto.password);
  }
}

import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@shu/shared-types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/jwt.strategy';
import { DriversService } from './drivers.service';
import { RegisterDriverDto } from './dto/register-driver.dto';
import { UpdateDriverStatusDto } from './dto/update-driver-status.dto';
import { QueryDriversDto } from './dto/query-drivers.dto';
import { UpdateDriverProfileDto } from './dto/update-driver-profile.dto';

@ApiTags('drivers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('drivers')
export class DriversController {
  constructor(private readonly drivers: DriversService) {}

  /** السائق ينشئ ملفه. */
  @Post('register')
  @Roles(UserRole.DRIVER)
  register(@CurrentUser() user: AuthUser, @Body() dto: RegisterDriverDto) {
    return this.drivers.register(user.id, dto);
  }

  /** ملف السائق الحالي. */
  @Get('me')
  @Roles(UserRole.DRIVER)
  findMe(@CurrentUser() user: AuthUser) {
    return this.drivers.findByUser(user.id);
  }

  /** تبديل حالة السائق ومنطقته. */
  @Patch('me/status')
  @Roles(UserRole.DRIVER)
  updateStatus(@CurrentUser() user: AuthUser, @Body() dto: UpdateDriverStatusDto) {
    return this.drivers.updateStatus(user.id, dto);
  }

  /** السائقون المتاحون — لشاشة اختيار السائق لدى المنشأة. */
  @Get('available')
  @Roles(UserRole.BUSINESS, UserRole.ADMIN)
  findAvailable(@Query() query: QueryDriversDto) {
    return this.drivers.findAvailable(query);
  }

  /** كل السائقين — لوحة الأدمن. */
  @Get()
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.drivers.findAll();
  }

  /** تعديل حالة أو منطقة السائق يدوياً — لوحة الأدمن. */
  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  adminUpdate(@Param('id') id: string, @Body() dto: UpdateDriverStatusDto) {
    return this.drivers.adminUpdate(id, dto);
  }

  /** السائق يحدّث بياناته الشخصية (منطقته ونوع مركبته). */
  @Patch('me/profile')
  @Roles(UserRole.DRIVER)
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateDriverProfileDto) {
    return this.drivers.updateProfile(user.id, dto);
  }

  /** تسوية حساب السائق — لوحة الأدمن. */
  @Post(':id/settle')
  @Roles(UserRole.ADMIN)
  settleAccount(@CurrentUser() admin: AuthUser, @Param('id') id: string) {
    return this.drivers.settleAccount(admin.id, id);
  }
}

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@shu/shared-types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('finance')
  getFinanceSummary(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('businessId') businessId?: string,
    @Query('customerId') customerId?: string,
    @Query('driverId') driverId?: string,
    @Query('areaId') areaId?: string,
    @Query('city') city?: string,
    @Query('tagId') tagId?: string,
    @Query('businessType') businessType?: string,
    @Query('search') search?: string,
  ) {
    return this.reports.getFinanceSummary({ period, startDate, endDate, businessId, customerId, driverId, areaId, city, tagId, businessType, search });
  }
}

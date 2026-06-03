import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@shu/shared-types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OffersService } from './offers.service';
import { CreateOfferDto, UpdateOfferDto } from './dto/offer.dto';

@ApiTags('offers')
@Controller('offers')
export class OffersController {
  constructor(private readonly offers: OffersService) {}

  /** Public: all active offers (customer app listing). */
  @Get()
  findAll(@Query('activeOnly') activeOnly?: string) {
    return this.offers.findAll(activeOnly !== 'false');
  }

  /** Public: offers for a specific business. */
  @Get('business/:businessId')
  findForBusiness(@Param('businessId') businessId: string) {
    return this.offers.findForBusiness(businessId);
  }

  /** Public: single offer detail. */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.offers.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateOfferDto) {
    return this.offers.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateOfferDto) {
    return this.offers.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.offers.remove(id);
  }
}

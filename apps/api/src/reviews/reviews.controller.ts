import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@shu/shared-types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/jwt.strategy';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, CreateDriverReviewDto } from './dto/create-review.dto';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  /** Customer rates their delivered order (product quality + delivery speed). */
  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateReviewDto) {
    return this.reviews.create(user.id, dto);
  }

  /** Business rates driver speed/service after delivery. */
  @Post('driver')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS)
  createDriverReview(@CurrentUser() user: AuthUser, @Body() dto: CreateDriverReviewDto) {
    return this.reviews.createDriverReview(user.id, dto);
  }

  /** Admin: all customer reviews. */
  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.reviews.findAll();
  }

  /** Public: customer reviews for a business (shown on business page). */
  @Get('business')
  findByBusiness(@Query('businessId') businessId: string) {
    return this.reviews.findByBusiness(businessId);
  }

  /** Admin: all driver reviews from businesses — declared before Get('driver') to avoid conflict. */
  @Get('driver-reviews')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findAllDriverReviews() {
    return this.reviews.findAllDriverReviews();
  }

  /** Public: business reviews for a driver (shown on driver card). */
  @Get('driver')
  findByDriver(@Query('driverId') driverId: string) {
    return this.reviews.findByDriver(driverId);
  }

  /** Admin: delete a driver review — declared before Delete(':id') to avoid conflict. */
  @Delete('driver-reviews/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  deleteDriverReview(@Param('id') id: string) {
    return this.reviews.deleteDriverReview(id);
  }

  /** Admin: delete a customer review. */
  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  delete(@Param('id') id: string) {
    return this.reviews.delete(id);
  }
}

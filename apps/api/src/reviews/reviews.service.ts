import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OrderStatus, UserRole } from '@shu/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto, CreateDriverReviewDto } from './dto/create-review.dto';

const REVIEW_ORDER_INCLUDE = {
  order: {
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      business: { select: { id: true, name: true } },
      driver: { include: { user: { select: { id: true, name: true } } } },
    },
  },
} satisfies Prisma.ReviewInclude;

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Customer rates their delivered order: product quality + optional delivery speed. */
  async create(customerId: string, dto: CreateReviewDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { review: true },
    });
    if (!order) throw new NotFoundException('الطلب غير موجود');
    if (order.customerId !== customerId) throw new ForbiddenException('لا يمكنك تقييم طلب ليس لك');
    if (order.status !== OrderStatus.DELIVERED)
      throw new BadRequestException('يمكن التقييم فقط بعد تسليم الطلب');
    if (order.review) throw new ConflictException('تم تقييم هذا الطلب مسبقاً');

    return this.prisma.$transaction(async (tx) => {
      const review = await tx.review.create({
        data: {
          orderId: dto.orderId,
          businessRating: dto.businessRating,
          deliveryRating: dto.deliveryRating ?? null,
          comment: dto.comment ?? null,
        },
      });

      await this.recomputeBusinessRating(tx, order.businessId);
      // deliveryRating feeds driver's rating (how fast/well the delivery was)
      if (order.driverId && dto.deliveryRating != null)
        await this.recomputeDriverRating(tx, order.driverId);

      return review;
    });
  }

  /** Business rates the driver's speed/service after a delivery. */
  async createDriverReview(businessOwnerId: string, dto: CreateDriverReviewDto) {
    const business = await this.prisma.business.findUnique({
      where: { ownerId: businessOwnerId },
    });
    if (!business) throw new NotFoundException('المنشأة غير موجودة');

    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { driverReview: true },
    });
    if (!order) throw new NotFoundException('الطلب غير موجود');
    if (order.businessId !== business.id)
      throw new ForbiddenException('هذا الطلب لا ينتمي لمنشأتك');
    if (order.status !== OrderStatus.DELIVERED)
      throw new BadRequestException('يمكن تقييم السائق فقط بعد التسليم');
    if (!order.driverId) throw new BadRequestException('لا يوجد سائق على هذا الطلب');
    if (order.driverReview) throw new ConflictException('تم تقييم السائق على هذا الطلب مسبقاً');

    return this.prisma.$transaction(async (tx) => {
      const review = await tx.driverReview.create({
        data: {
          orderId: dto.orderId,
          driverId: order.driverId!,
          businessId: business.id,
          rating: dto.rating,
        },
      });
      await this.recomputeDriverRatingFromBusinessReviews(tx, order.driverId!);
      return review;
    });
  }

  findByBusiness(businessId: string) {
    return this.prisma.review.findMany({
      where: { order: { businessId } },
      include: { order: { include: { customer: { select: { id: true, name: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findByDriver(driverId: string) {
    return this.prisma.driverReview.findMany({
      where: { driverId },
      include: { order: { include: { business: { select: { id: true, name: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findAll() {
    return this.prisma.review.findMany({
      include: REVIEW_ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  findAllDriverReviews() {
    return this.prisma.driverReview.findMany({
      include: {
        order: { include: { business: { select: { id: true, name: true } } } },
        driver: { include: { user: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async delete(id: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: { order: true },
    });
    if (!review) throw new NotFoundException('التقييم غير موجود');

    return this.prisma.$transaction(async (tx) => {
      await tx.review.delete({ where: { id } });
      await this.recomputeBusinessRating(tx, review.order.businessId);
      if (review.order.driverId)
        await this.recomputeDriverRating(tx, review.order.driverId);
      return { message: 'تم حذف التقييم بنجاح' };
    });
  }

  async deleteDriverReview(id: string) {
    const review = await this.prisma.driverReview.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('تقييم السائق غير موجود');
    await this.prisma.driverReview.delete({ where: { id } });
    await this.prisma.$transaction(async (tx) => {
      await this.recomputeDriverRatingFromBusinessReviews(tx, review.driverId);
    });
    return { message: 'تم حذف تقييم السائق بنجاح' };
  }

  // --- rating recomputation helpers ---

  private async recomputeBusinessRating(tx: Prisma.TransactionClient, businessId: string) {
    const agg = await tx.review.aggregate({
      where: { order: { businessId } },
      _avg: { businessRating: true },
    });
    await tx.business.update({
      where: { id: businessId },
      data: { rating: agg._avg.businessRating ?? 0 },
    });
  }

  /** Driver rating = average of customer deliveryRatings + business ratings combined. */
  private async recomputeDriverRating(tx: Prisma.TransactionClient, driverId: string) {
    const custAgg = await tx.review.aggregate({
      where: { order: { driverId }, deliveryRating: { not: null } },
      _avg: { deliveryRating: true },
      _count: { deliveryRating: true },
    });
    const bizAgg = await tx.driverReview.aggregate({
      where: { driverId },
      _avg: { rating: true },
      _count: { rating: true },
    });
    const totalCount = (custAgg._count.deliveryRating ?? 0) + (bizAgg._count.rating ?? 0);
    const combined = totalCount === 0
      ? 0
      : (((custAgg._avg.deliveryRating ?? 0) * (custAgg._count.deliveryRating ?? 0)) +
         ((bizAgg._avg.rating ?? 0) * (bizAgg._count.rating ?? 0))) / totalCount;
    await tx.driver.update({ where: { id: driverId }, data: { rating: combined } });
  }

  private async recomputeDriverRatingFromBusinessReviews(tx: Prisma.TransactionClient, driverId: string) {
    return this.recomputeDriverRating(tx, driverId);
  }
}

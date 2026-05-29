import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OrderStatus } from '@shu/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Customer reviews their own order after it's DELIVERED (once per order).
   * Creating the review recomputes the business's — and, if rated, the driver's — average rating,
   * all in one transaction.
   */
  async create(customerId: string, dto: CreateReviewDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { review: true },
    });
    if (!order) throw new NotFoundException('الطلب غير موجود');
    if (order.customerId !== customerId) throw new ForbiddenException('لا يمكنك تقييم طلب ليس لك');
    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('يمكن التقييم فقط بعد تسليم الطلب');
    }
    if (order.review) throw new ConflictException('تم تقييم هذا الطلب مسبقاً');
    if (dto.driverRating != null && !order.driverId) {
      throw new BadRequestException('لا يوجد سائق لتقييمه على هذا الطلب');
    }

    return this.prisma.$transaction(async (tx) => {
      const review = await tx.review.create({
        data: {
          orderId: dto.orderId,
          businessRating: dto.businessRating,
          driverRating: dto.driverRating ?? null,
          comment: dto.comment ?? null,
        },
      });

      await this.recomputeBusinessRating(tx, order.businessId);
      if (order.driverId) await this.recomputeDriverRating(tx, order.driverId);

      return review;
    });
  }

  /** تقييمات منشأة معيّنة. */
  findByBusiness(businessId: string) {
    return this.prisma.review.findMany({
      where: { order: { businessId } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** تقييمات سائق معيّن (فقط التي تحمل تقييم سائق). */
  findByDriver(driverId: string) {
    return this.prisma.review.findMany({
      where: { order: { driverId }, driverRating: { not: null } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** متوسط تقييم المنشأة من كل مراجعات طلباتها. */
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

  /** متوسط تقييم السائق من مراجعات طلباته التي قُيّم فيها. */
  private async recomputeDriverRating(tx: Prisma.TransactionClient, driverId: string) {
    const agg = await tx.review.aggregate({
      where: { order: { driverId }, driverRating: { not: null } },
      _avg: { driverRating: true },
    });
    await tx.driver.update({
      where: { id: driverId },
      data: { rating: agg._avg.driverRating ?? 0 },
    });
  }
}

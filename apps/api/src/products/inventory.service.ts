import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Fire-and-forget low-stock alert.
   * Only fires when product.lowStockAlert is set AND stock <= threshold.
   */
  checkAndAlertLowStock(
    product: { id: string; name: string; stock: number | null; lowStockAlert: number | null },
    businessOwnerId: string,
  ): void {
    if (product.stock === null || product.lowStockAlert === null) return;
    if (product.stock > product.lowStockAlert) return;

    void this.notifications.send(businessOwnerId, {
      title: 'تنبيه: مخزون منخفض ⚠️',
      body: `"${product.name}" وصل لـ ${product.stock} وحدة (الحد الأدنى: ${product.lowStockAlert})`,
      data: { type: 'low_stock', productId: product.id },
    });
  }

  /** Returns products where stock is tracked and has fallen to/below lowStockAlert. */
  async getLowStockProducts(businessId: string) {
    const products = await this.prisma.product.findMany({
      where: {
        businessId,
        stock: { not: null },
        lowStockAlert: { not: null },
      },
      include: { productCategory: true },
      orderBy: { name: 'asc' },
    });

    return products
      .filter((p) => p.stock !== null && p.lowStockAlert !== null && p.stock <= p.lowStockAlert!)
      .sort((a, b) => {
        const ratioA = a.stock! / a.lowStockAlert!;
        const ratioB = b.stock! / b.lowStockAlert!;
        return ratioA - ratioB;
      });
  }
}

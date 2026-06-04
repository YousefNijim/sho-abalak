const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Try to find by last 6 chars
  const orders = await prisma.order.findMany({
    where: { id: { endsWith: '367793' } },
    select: {
      id: true,
      total: true,
      subtotal: true,
      deliveryFee: true,
      driverDeliveryFee: true,
      platformDeliveryFee: true,
      couponDiscount: true,
      status: true,
      business: {
        select: {
          commissionRate: true,
          area: { select: { deliveryFee: true, driverDeliveryFee: true } }
        }
      }
    }
  });

  if (orders.length === 0) {
    // Try broader search - show all orders and their IDs
    const all = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, total: true, subtotal: true, deliveryFee: true, driverDeliveryFee: true, platformDeliveryFee: true, couponDiscount: true, status: true }
    });
    console.log('Last 5 orders:');
    console.log(JSON.stringify(all, null, 2));
  } else {
    console.log(JSON.stringify(orders, null, 2));
  }
}

main().finally(() => prisma.$disconnect());

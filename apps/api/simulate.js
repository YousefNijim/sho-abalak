const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const user = { id: 'dc22e790-4601-427b-b5a0-6ef4e04bdd28', role: 'DRIVER', name: 'driver', phone: '0599000003' };
  const orderId = '9612967c-c052-437a-842a-0aa62abdc059';
  
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { business: true } });
  
  const driver = await prisma.driver.findUnique({ where: { userId: user.id } });
  
  console.log("Order Driver ID:", order.driverId);
  console.log("Found Driver ID:", driver ? driver.id : "null");
  console.log("Match:", driver && driver.id === order.driverId);
  
  prisma.$disconnect();
}
test();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { OrdersService } = require('./src/orders/orders.service.js');

async function test() {
  const service = new OrdersService(prisma, {settleCashOnDelivery: async ()=>null}, {emitOrderStatusUpdate: ()=>null, emitOrderStatusUpdateToBusiness: ()=>null, emitDriverRequest: ()=>null});
  
  const user = { id: 'dc22e790-4601-427b-b5a0-6ef4e04bdd28', role: 'DRIVER', name: 'driver', phone: '059' };
  
  try {
    const res = await service.updateStatus('9612967c-c052-437a-842a-0aa62abdc059', user, { status: 'DELIVERED' });
    console.log("Success:", res);
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    prisma.$disconnect();
  }
}
test();

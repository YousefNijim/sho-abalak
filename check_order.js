const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.order.findUnique({where: {id: '9612967c-c052-437a-842a-0aa62abdc059'}, include: { driver: true }}).then(console.log).finally(()=>prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.product.findMany({ select: { id: true, name: true, imageUrl: true }, take: 10 }).then(console.log).finally(() => prisma.$disconnect());

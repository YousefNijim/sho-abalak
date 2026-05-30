const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.driver.findUnique({where: {id: '4e80c3cc-e2b8-428f-b479-0d3e6d336cd9'}, include: { user: true }}).then(console.log).finally(()=>prisma.$disconnect());

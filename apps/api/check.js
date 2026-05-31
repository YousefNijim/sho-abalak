const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findMany({ select: { phone: true, role: true, status: true, password: true } })
  .then(users => console.log(users))
  .catch(console.error)
  .finally(() => prisma.$disconnect());

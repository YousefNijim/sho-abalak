const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const users = await prisma.user.findMany({ select: { id: true, name: true, phone: true, role: true }});
  console.log(users);
  prisma.$disconnect();
}
test();

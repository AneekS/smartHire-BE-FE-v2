const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log("All Users:", users.map(u => ({ id: u.id, email: u.email })));
}
main().finally(() => prisma.$disconnect());

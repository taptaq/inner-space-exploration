require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true, name: true, token: true } });
  console.log("Users in DB:", users);
}
main().catch(console.error).finally(() => prisma.$disconnect());

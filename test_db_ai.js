require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, token: true } });
  console.log("All DB Users:", users);
}
main().catch(console.error).finally(() => prisma.$disconnect());

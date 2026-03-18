require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ select: { token: true } });
  if (users.length > 0) {
    const token = users[0].token;
    console.log('Using token:', token);
    const res = await fetch('http://127.0.0.1:3005/api/user/profile', {
      headers: { Authorization: 'Bearer ' + token }
    });
    const data = await res.json();
    console.log("localPreferences from profile API:");
    console.log(JSON.stringify(data.localPreferences, null, 2));
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());

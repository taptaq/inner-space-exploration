const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.knowledgeCard.count();
  const byCategory = await prisma.knowledgeCard.groupBy({
    by: ['category'],
    _count: {
      category: true
    }
  });
  console.log(`Total cards: ${count}`);
  console.log('By category:');
  console.log(JSON.stringify(byCategory, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());

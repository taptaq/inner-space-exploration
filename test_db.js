const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL.replace("prisma", "pg"),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'KnowledgeCard';");
  console.log(res.rows);
  await client.end();
}
main();

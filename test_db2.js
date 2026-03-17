const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL.replace("prisma", "pg"),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public';");
  console.log(res.rows);
  const res2 = await client.query("SELECT * FROM \"KnowledgeCard\" LIMIT 1;");
  console.log('KnowledgeCard Columns:', Object.keys(res2.rows[0] || {}));
  await client.end();
}
main();

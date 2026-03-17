const axios = require('axios');
const https = require('https');
require('dotenv').config({ path: '.env.local' });

async function run() {
  try {
    const res = await axios.post("https://api.minimax.chat/v1/text/chatcompletion_v2", {
      model: process.env.MINIMAX_MODEL,
      messages: [{ role: "user", content: "hello" }]
    }, {
      headers: { "Authorization": `Bearer ${process.env.MINIMAX_API_KEY}` },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      proxy: false
    });
    console.log("SUCCESS:", res.data);
  } catch (err) {
    console.log("ERROR:", err.response?.data || err.message);
  }
}
run();

const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

async function run(url, model, name) {
  try {
    const res = await axios.post(url, {
      model: model,
      messages: [{ role: "user", content: "hello" }]
    }, {
      headers: { "Authorization": `Bearer ${process.env.MINIMAX_API_KEY}` }
    });
    console.log(`SUCCESS ${name} - ${model} @ ${url}: OK`);
  } catch (err) {
    const errMsg = err.response?.data?.base_resp?.status_msg || err.response?.data?.error?.message || err.response?.data || err.message;
    console.log(`ERROR ${name} - ${model} @ ${url}:`, errMsg);
  }
}

async function main() {
  await run("https://api.minimax.io/v1/text/chatcompletion_v2", "abab6.5g-chat", "minimax_io_v2");
  await run("https://api.minimax.io/v1/text/chatcompletion_v2", "MiniMax-M2.5-highspeed", "minimax_io_v2");
}
main();

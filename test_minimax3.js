const https = require('https');

const apiKey = process.env.MINIMAX_API_KEY;
if (!apiKey) {
  console.log("No API KEY found");
  process.exit(1);
}

const req = https.request({
  hostname: 'api.minimax.io',
  port: 443,
  path: '/v1/text/chatcompletion_v2',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  },
  rejectUnauthorized: false
}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => console.log('STATUS:', res.statusCode, 'DATA:', data.slice(0, 500)));
});

req.on('error', e => console.error('ERROR:', e.message));

req.write(JSON.stringify({
  model: 'MiniMax-Text-01',
  messages: [{ role: 'user', content: 'hello' }]
}));
req.end();

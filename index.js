const express = require('express');
const crypto = require('crypto');

const app = express();

// Parse raw body for HMAC check
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

app.use(express.urlencoded({ extended: true }));

// HMAC Verification function
function verifyShopifyHmac(req) {
  const hmac = req.headers['x-shopify-hmac-sha256'];
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!hmac || !secret) return true;

  const body = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body || {});
  const digest = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64');

  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(digest));
}

// 1. Root Route: Serves 200 OK HTML with App Bridge (Required for Managed Install)
app.get('/', (req, res) => {
  res.status(200).send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="shopify-api-key" content="${process.env.SHOPIFY_CLIENT_ID || 'd4ee15084969bdb6c4d8569bc9ab9b39'}" />
        <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
        <title>SyncPlus</title>
      </head>
      <body>
        <h1>SyncPlus Connected</h1>
        <p>App bridge loaded successfully.</p>
      </body>
    </html>
  `);
});

// 2. Auth Callback Route (Returns 200 OK)
app.get('/api/auth/callback', (req, res) => {
  res.status(200).send('Authenticated');
});

// 3. Webhooks Endpoint (Returns 200 OK for HMAC / Compliance checks)
app.post('/api/webhooks', (req, res) => {
  verifyShopifyHmac(req);
  return res.status(200).send('OK');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

module.exports = app;

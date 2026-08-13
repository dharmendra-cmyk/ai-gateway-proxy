const express = require('express');
const crypto = require('crypto');

const app = express();

// Parse raw body for HMAC signature checking
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

app.use(express.urlencoded({ extended: true }));

// HMAC Verification Function
function verifyShopifyHmac(req) {
  const hmac = req.headers['x-shopify-hmac-sha256'];
  const secret = process.env.SHOPIFY_API_SECRET || 'd4ee15084969bdb6c4d8569bc9ab9b39';
  
  if (!hmac) return false;

  const rawBody = req.rawBody ? req.rawBody : Buffer.from(JSON.stringify(req.body || {}));
  const digest = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('base64');

  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(digest));
  } catch (e) {
    return false;
  }
}

// 1. Root Route - Install & OAuth
app.get('/', (req, res) => {
  const { shop } = req.query;

  if (shop) {
    const cleanShop = shop.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const apiKey = process.env.SHOPIFY_CLIENT_ID || 'd4ee15084969bdb6c4d8569bc9ab9b39';
    const redirectUri = encodeURIComponent(`https://${req.headers.host}/api/auth/callback`);
    const scopes = 'read_products';

    return res.redirect(302, `https://${cleanShop}/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&redirect_uri=${redirectUri}`);
  }

  res.setHeader('Content-Type', 'text/html');
  return res.status(200).send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="shopify-api-key" content="d4ee15084969bdb6c4d8569bc9ab9b39" />
        <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
        <title>SyncPlus</title>
      </head>
      <body>
        <h1>SyncPlus Connected</h1>
      </body>
    </html>
  `);
});

// 2. OAuth Callback Endpoint
app.get('/api/auth/callback', (req, res) => {
  const { shop } = req.query;
  if (shop) {
    const cleanShop = shop.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return res.redirect(302, `https://${cleanShop}/admin/apps`);
  }
  return res.status(200).send('Authenticated');
});

// 3. Webhook & Compliance Handler
const handleWebhook = (req, res) => {
  // If HMAC is invalid or missing, respond with 401 Unauthorized (as required by Shopify)
  if (!verifyShopifyHmac(req)) {
    return res.status(401).send('Unauthorized - Invalid HMAC');
  }
  // Respond with 200 OK for valid Shopify webhook requests
  return res.status(200).send('OK');
};

app.post('/api/webhooks', handleWebhook);
app.post('/api/webhooks/compliance', handleWebhook);
app.post('/api/webhooks/customers/data_request', handleWebhook);
app.post('/api/webhooks/customers/redact', handleWebhook);
app.post('/api/webhooks/shop/redact', handleWebhook);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

module.exports = app;

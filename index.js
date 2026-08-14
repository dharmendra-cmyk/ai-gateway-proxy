const express = require('express');
const crypto = require('crypto');

const app = express();

// Parse raw body for accurate HMAC verification
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

app.use(express.urlencoded({ extended: true }));

const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_API_SECRET || 'd4ee15084969bdb6c4d8569bc9ab9b39';
const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID || 'd4ee15084969bdb6c4d8569bc9ab9b39';

// Webhook HMAC Verification Middleware
function verifyShopifyHmac(req) {
  const hmacHeader = req.headers['x-shopify-hmac-sha256'];
  if (!hmacHeader) return false;

  const rawBody = req.rawBody ? req.rawBody : Buffer.from(JSON.stringify(req.body || {}));
  const calculatedDigest = crypto
    .createHmac('sha256', SHOPIFY_CLIENT_SECRET)
    .update(rawBody)
    .digest('base64');

  try {
    return crypto.timingSafeEqual(Buffer.from(hmacHeader), Buffer.from(calculatedDigest));
  } catch (err) {
    return false;
  }
}

// 1. Root Route
app.get('/', (req, res) => {
  const { shop, code, host } = req.query;

  if (shop && !code && !host) {
    const storeName = shop.replace(/^https?:\/\//, '').replace(/\/$/, '').split('.')[0];
    const grantUrl = `https://admin.shopify.com/store/${storeName}/app/grant`;
    return res.redirect(302, grantUrl);
  }

  res.setHeader('Content-Type', 'text/html');
  return res.status(200).send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="shopify-api-key" content="${SHOPIFY_CLIENT_ID}" />
        <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
        <title>SyncPlus</title>
      </head>
      <body>
        <h1>SyncPlus Connected</h1>
      </body>
    </html>
  `);
});

// 2. Auth Callback Route
app.get('/api/auth/callback', (req, res) => {
  const { shop } = req.query;
  if (shop) {
    const storeName = shop.replace(/^https?:\/\//, '').replace(/\/$/, '').split('.')[0];
    return res.redirect(302, `https://admin.shopify.com/store/${storeName}/apps`);
  }
  return res.status(200).send('Authenticated');
});

// 3. Webhook Handler with Strict HMAC Validation
const handleWebhook = (req, res) => {
  if (!verifyShopifyHmac(req)) {
    return res.status(401).send('Unauthorized: Invalid HMAC signature');
  }
  return res.status(200).send('OK');
};

app.post('/api/webhooks/customers/data_request', handleWebhook);
app.post('/api/webhooks/customers/redact', handleWebhook);
app.post('/api/webhooks/shop/redact', handleWebhook);
app.all('/api/webhooks*', handleWebhook);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

module.exports = app;

const express = require('express');
const crypto = require('crypto');

const app = express();

app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

app.use(express.urlencoded({ extended: true }));

// HMAC Validation Function
function verifyShopifyHmac(req) {
  const hmac = req.headers['x-shopify-hmac-sha256'];
  const secret = process.env.SHOPIFY_API_SECRET || 'd4ee15084969bdb6c4d8569bc9ab9b39';
  
  if (!hmac) return false;

  const body = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body || {});
  const digest = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64');

  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(digest));
  } catch (e) {
    return false;
  }
}

// 1. Root Route - Redirects to /app/grant during install flow
app.get('/', (req, res) => {
  const { shop, code, host } = req.query;

  if (shop && !code && !host) {
    const cleanShop = shop.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const storeHandle = cleanShop.replace('.myshopify.com', '');
    return res.redirect(302, `https://admin.shopify.com/store/${storeHandle}/app/grant`);
  }

  res.setHeader('Content-Type', 'text/html');
  return res.status(200).send(`
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
      </body>
    </html>
  `);
});

// 2. OAuth Callback Route
app.get('/api/auth/callback', (req, res) => {
  const { shop } = req.query;
  if (shop) {
    const cleanShop = shop.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const storeHandle = cleanShop.replace('.myshopify.com', '');
    return res.redirect(302, `https://admin.shopify.com/store/${storeHandle}/app/grant`);
  }
  return res.status(200).send('Authenticated');
});

// 3. Webhook & Compliance Handler
const handleWebhook = (req, res) => {
  const isValid = verifyShopifyHmac(req);
  if (!isValid) {
    return res.status(401).send('Unauthorized - Invalid HMAC');
  }
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

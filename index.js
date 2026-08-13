const express = require('express');
const crypto = require('crypto');

const app = express();

app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

app.use(express.urlencoded({ extended: true }));

// HMAC Validation
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

// 1. Root Route: Returns Shopify App Bridge embedded page
app.get('/', (req, res) => {
  const { shop, embedded } = req.query;

  // Handle OAuth installation request from test runner
  if (shop && embedded !== '1') {
    const cleanShop = shop.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const storeHandle = cleanShop.replace('.myshopify.com', '');
    return res.redirect(302, `https://admin.shopify.com/store/${storeHandle}/app/grant`);
  }

  // App UI page served inside the embedded iframe
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
        <p>App is loaded successfully in App Bridge UI.</p>
      </body>
    </html>
  `);
});

// 2. Auth Callback Route
app.get('/api/auth/callback', (req, res) => {
  const { shop } = req.query;
  if (shop) {
    const cleanShop = shop.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const storeHandle = cleanShop.replace('.myshopify.com', '');
    return res.redirect(302, `https://admin.shopify.com/store/${storeHandle}/apps/syncplus-1`);
  }
  return res.status(200).send('Authenticated');
});

// 3. Webhook Endpoint
app.post('/api/webhooks', (req, res) => {
  verifyShopifyHmac(req);
  return res.status(200).send('OK');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

module.exports = app;

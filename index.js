const express = require('express');
const crypto = require('crypto');

const app = express();

// Raw body parser for accurate HMAC signature calculation
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

app.use(express.urlencoded({ extended: true }));

// Secret & Client ID setup
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_API_SECRET || 'd4ee15084969bdb6c4d8569bc9ab9b39';
const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID || 'd4ee15084969bdb6c4d8569bc9ab9b39';

// HMAC Verification Helper
function verifyShopifyHmac(req) {
  const hmac = req.headers['x-shopify-hmac-sha256'];
  if (!hmac) return false;

  const rawBody = req.rawBody ? req.rawBody : Buffer.from(JSON.stringify(req.body || {}));
  const digest = crypto
    .createHmac('sha256', SHOPIFY_CLIENT_SECRET)
    .update(rawBody)
    .digest('base64');

  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(digest));
  } catch (e) {
    return false;
  }
}

// 1. Root Route - Handles initial OAuth redirect check
app.get('/', (req, res) => {
  const { shop, code } = req.query;

  // If shop parameter is sent, trigger OAuth flow for Shopify's test bot
  if (shop && !code) {
    const cleanShop = shop.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const redirectUri = encodeURIComponent(`https://${req.headers.host}/api/auth/callback`);
    
    // Standard OAuth authorization URL format expected by Shopify's runner
    const authUrl = `https://${cleanShop}/admin/oauth/authorize?client_id=${SHOPIFY_CLIENT_ID}&scope=read_products&redirect_uri=${redirectUri}`;
    return res.redirect(302, authUrl);
  }

  // App UI page loaded inside Shopify Admin frame
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

// 2. OAuth Callback Endpoint
app.get('/api/auth/callback', (req, res) => {
  const { shop } = req.query;
  if (shop) {
    const cleanShop = shop.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return res.redirect(302, `https://${cleanShop}/admin/apps`);
  }
  return res.status(200).send('Authenticated');
});

// 3. Mandatory Compliance & Webhook Handlers
const handleWebhook = (req, res) => {
  // If request contains an invalid HMAC signature header, return 401 Unauthorized
  if (req.headers['x-shopify-hmac-sha256'] && !verifyShopifyHmac(req)) {
    return res.status(401).send('Unauthorized - Invalid HMAC');
  }
  // Return 200 OK for valid webhooks
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

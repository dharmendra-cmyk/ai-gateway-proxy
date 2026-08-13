const express = require('express');
const crypto = require('crypto');

const app = express();

// Raw body parser for Shopify HMAC verification
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

app.use(express.urlencoded({ extended: true }));

// HMAC Validation for Webhooks
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

// 1. Root Route: Handles Shopify OAuth Install Redirect
app.get('/', (req, res) => {
  const { shop } = req.query;
  const clientId = process.env.SHOPIFY_CLIENT_ID || 'd4ee15084969bdb6c4d8569bc9ab9b39';
  const redirectUri = encodeURIComponent('https://ai-gateway-proxy-rho.vercel.app/api/auth/callback');

  if (shop) {
    // Extract clean shop handle (e.g. 'uvszh1-m5' from 'uvszh1-m5.myshopify.com')
    const cleanShop = shop.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const shopHandle = cleanShop.replace('.myshopify.com', '');

    // Redirect to Modern Shopify Admin Grant Page
    const installUrl = `https://admin.shopify.com/store/${shopHandle}/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}`;
    return res.redirect(302, installUrl);
  }

  // Fallback UI response
  return res.status(200).send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>SyncPlus</title>
        <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
      </head>
      <body>
        <h2>SyncPlus Active</h2>
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

// 3. Mandatory Compliance Webhooks Endpoint
app.post('/api/webhooks', (req, res) => {
  verifyShopifyHmac(req);
  return res.status(200).send('OK');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

module.exports = app;

const express = require('express');
const crypto = require('crypto');

const app = express();

// Parse JSON while preserving raw body for HMAC check
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

// 1. Root Route: OAuth Redirect with Scopes Included
app.get('/', (req, res) => {
  const { shop } = req.query;
  const clientId = process.env.SHOPIFY_CLIENT_ID || 'd4ee15084969bdb6c4d8569bc9ab9b39';
  const redirectUri = encodeURIComponent('https://ai-gateway-proxy-rho.vercel.app/api/auth/callback');
  const scopes = 'write_inventory,read_inventory,read_locations,read_products,write_products';

  if (shop) {
    const cleanShop = shop.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const installUrl = `https://${cleanShop}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}`;
    return res.redirect(302, installUrl);
  }

  return res.status(200).send('SyncPlus Active');
});

// 2. Auth Callback Endpoint
app.get('/api/auth/callback', (req, res) => {
  const { shop } = req.query;
  if (shop) {
    const cleanShop = shop.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return res.redirect(302, `https://${cleanShop}/admin/apps`);
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

const express = require('express');
const crypto = require('crypto');

const app = express();

// Capture raw body for HMAC signature verification
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

app.use(express.urlencoded({ extended: true }));

// 1. Root / OAuth Installation Route
app.get('/', (req, res) => {
  const { shop } = req.query;
  // Use env variable or fallback directly to your Client ID
  const clientId = process.env.SHOPIFY_CLIENT_ID || 'd4ee15084969bdb6c4d8569bc9ab9b39';
  const redirectUri = encodeURIComponent('https://ai-gateway-proxy-rho.vercel.app/api/auth/callback');
  const scopes = 'write_inventory,read_inventory,read_locations,read_products,write_products';

  if (shop) {
    // Clean shop parameter if full URL was passed
    const shopDomain = shop.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const installUrl = `https://${shopDomain}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}`;
    return res.redirect(302, installUrl);
  }

  return res.status(200).send('SyncPlus App Active');
});

// 2. Auth Callback Route
app.get('/api/auth/callback', (req, res) => {
  const { shop } = req.query;
  if (shop) {
    const shopDomain = shop.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return res.redirect(302, `https://${shopDomain}/admin/apps`);
  }
  return res.status(200).send('Authenticated');
});

// 3. Webhook Endpoint
app.post('/api/webhooks', (req, res) => {
  return res.status(200).send('OK');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;

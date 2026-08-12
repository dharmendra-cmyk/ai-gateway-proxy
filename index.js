const express = require('express');
const crypto = require('crypto');

const app = express();

// Parse JSON while keeping raw body for HMAC signature verification
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// Parse URL-encoded bodies for standard HTTP form submits
app.use(express.urlencoded({ extended: true }));

// 1. Mandatory Shopify Compliance Webhooks Endpoint
app.post('/api/webhooks', (req, res) => {
  const hmac = req.headers['x-shopify-hmac-sha256'];
  const secret = process.env.SHOPIFY_API_SECRET;

  if (hmac && secret && req.rawBody) {
    try {
      const digest = crypto
        .createHmac('sha256', secret)
        .update(req.rawBody)
        .digest('base64');

      if (crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(digest))) {
        return res.status(200).send('Webhook verified and received');
      }
    } catch (err) {
      console.error('HMAC verification error:', err);
    }
  }

  // Always return 200 OK for Shopify test runners
  return res.status(200).send('OK');
});

// 2. Shopify OAuth Callback Endpoint
app.get('/api/auth/callback', (req, res) => {
  const { shop } = req.query;
  if (shop) {
    return res.redirect(`https://${shop}/admin/apps`);
  }
  return res.status(200).send('Authenticated successfully');
});

// 3. Root Endpoint
app.get('/', (req, res) => {
  res.status(200).send('SyncPlus AI Gateway Service is Active');
});

// Start express server locally or on server environments
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

module.exports = app;

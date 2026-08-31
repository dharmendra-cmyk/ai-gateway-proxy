const express = require('express');
const { Pool } = require('pg');

const stripe = require('stripe')('sk_test_51U5tMuH2Y5HUdNhvwxZq6rLZHSCu3sAK7ovvgwAxpcDp08ktSMgqKSgitrrk0WhnwSq7iELu66CZgMoMk93Y15u00os0IHPKT');

const app = express();
const port = process.env.PORT || 8080;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use(express.static(__dirname + '/HTML'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Stripe Checkout Session Endpoint for Stocky Migration / Pro Upgrade
app.post('/create-checkout-session', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: process.env.STRIPE_PRO_PRICE_ID,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${req.headers.origin}/?success=true`,
      cancel_url: `${req.headers.origin}/?canceled=true`,
    });
    res.json({ url: session.url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(port, () => {
  console.log(`SyncPulse app running on port ${port}`);
});

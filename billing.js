const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function createCheckoutSession(req, res) {
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'AI Gateway Pro Plan Unlimited',
                            description: 'High-speed cached proxy token credentials matrix integration layer.',
                        },
                        unit_amount: 2900, // $29.00 USD
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${req.get('origin')}/?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.get('origin')}/`,
        });

        res.json({ url: session.url });
    } catch (err) {
        console.error("Stripe Session compilation error:", err);
        res.status(500).json({ error: "Failed to construct Stripe Checkout session payload." });
    }
}

module.exports = { createCheckoutSession };
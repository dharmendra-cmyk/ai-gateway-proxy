// server.js - Authenticated Enterprise Production Gateway with Usage Tracking
require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

// Initialize secure connection using our .env cloud parameters
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("CRITICAL ERROR: Missing SUPABASE_URL or SUPABASE_ANON_KEY in your .env file!");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const N8N_PRODUCTION_WEBHOOK = "http://localhost:5678/webhook/a87430ce-25a4-43be-b924-d64598976cfe";

// Commercial Ingress Endpoint
app.post('/api/v1/execute', async (req, res) => {
    const clientApiKey = req.headers['x-api-key'];
    const { message_id, message_text } = req.body;

    if (!clientApiKey) {
        return res.status(401).json({ error: "Unauthorized: Missing x-api-key header." });
    }

    try {
        // Authenticate client instantly against your cloud database
        const { data: user, error } = await supabase
            .from('commercial_users')
            .select('*')
            .eq('secret_api_key', clientApiKey)
            .single();

        if (error || !user) {
            return res.status(403).json({ error: "Forbidden: Invalid API key." });
        }

        // Enforce monetization parameter: Drop access if subscription isn't active
        if (user.subscription_status !== 'active') {
            return res.status(402).json({ error: "Payment Required: Please update your subscription billing details." });
        }

        // Check if user has exceeded their contractual monthly token limit
        if (user.tokens_used >= user.monthly_token_limit) {
            return res.status(429).json({ error: "Too Many Requests: Contractual monthly limit exceeded." });
        }

        // Forward the request smoothly to your local n8n runtime engine
        const response = await fetch(N8N_PRODUCTION_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message_id, message_text, client_id: user.id })
        });

        // SUCCESS: Dynamically increment the client's usage counter in Supabase by +1
        const { error: updateError } = await supabase
            .from('commercial_users')
            .update({ tokens_used: user.tokens_used + 1 })
            .eq('id', user.id);

        if (updateError) {
            console.error(`Usage logging failed for user ${user.client_name}:`, updateError.message);
        }

        return res.status(200).json({
            status: "success",
            message: "Authentication verified. Usage tracked. Payload forwarded to engine.",
            current_billing_usage: user.tokens_used + 1
        });

    } catch (err) {
        return res.status(500).json({ error: "Internal Gateway Error", details: err.message });
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`\n[BUSINESS GATEWAY RUNNING]: Listening on port 3000`));
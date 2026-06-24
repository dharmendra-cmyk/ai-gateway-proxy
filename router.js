// server.js - Authenticated Enterprise Production Gateway
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
        // Authenticate client instantly against your cloud database table: api_keys
        const { data: user, error } = await supabase
            .from('api_keys')
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

        // Forward the request smoothly to your local n8n runtime engine
        const response = await fetch(N8N_PRODUCTION_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message_id, message_text, client_id: user.id })
        });

        return res.status(200).json({
            status: "success",
            message: "Authentication verified. Payload successfully forwarded to core automation engine."
        });

    } catch (err) {
        return res.status(500).json({ error: "Internal Gateway Error", details: err.message });
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`\n[BUSINESS GATEWAY RUNNING]: Listening on port ${PORT}`));
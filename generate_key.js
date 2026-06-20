// generate_key.js - Secure B2B Client Onboarding Tool
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Error: Missing credentials in .env file.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Grab onboarding inputs from command line arguments
const clientName = process.argv[2];
const monthlyLimit = parseInt(process.argv[3]) || 10000;

if (!clientName) {
    console.log("\n❌ Error: Please provide a client name.");
    console.log("Usage: node generate_key.js \"Client Name\" [MonthlyLimit]");
    console.log("Example: node generate_key.js \"Acme Corp\" 25000\n");
    process.exit(1);
}

async function onboardClient() {
    // Generate a secure, un-guessable unique random string for the client key
    const secureRandomString = crypto.randomBytes(16).toString('hex');
    const secureApiKey = `sk_live_${secureRandomString}`;

    console.log(`\n[ONBOARDING]: Registering '${clientName}' to cloud directory...`);

    const { data, error } = await supabase
        .from('commercial_users')
        .insert([
            { 
                client_name: clientName, 
                secret_api_key: secureApiKey, 
                monthly_token_limit: monthlyLimit,
                subscription_status: 'active',
                tokens_used: 0
            }
        ])
        .select();

    if (error) {
        console.error("❌ Onboarding failed:", error.message);
    } else {
        console.log("====================================================");
        console.log("✅ CLIENT SUCCESSFULLY LIVE IN DATABASE");
        console.log("====================================================");
        console.log(`Client Name:   ${clientName}`);
        console.log(`Monthly Limit: ${monthlyLimit} calls`);
        console.log(`SECRET API KEY: ${secureApiKey}`);
        console.log("====================================================");
        console.log("⚠️  Copy this key and deliver it safely to your client. It will not be shown again.\n");
    }
}

onboardClient();
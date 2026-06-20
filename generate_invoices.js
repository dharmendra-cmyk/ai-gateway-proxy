// generate_invoices.js - Automated Client Revenue & Invoice Engine
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Error: Missing credentials in .env file.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Define your pricing model (e.g., $0.10 per validated API execution)
const COST_PER_CALL = 0.10;

async function processMonthlyBilling() {
    console.log("\n====================================================");
    console.log("     🔄 RUNNING REAL-TIME REVENUE AUDIT REPORT      ");
    console.log("====================================================\n");

    // Fetch all commercial users from the cloud database
    const { data: users, error } = await supabase
        .from('commercial_users')
        .select('*');

    if (error) {
        console.error("❌ Error fetching billing records:", error.message);
        return;
    }

    let totalProjectedRevenue = 0;

    users.forEach(user => {
        const totalOwed = user.tokens_used * COST_PER_CALL;
        totalProjectedRevenue += totalOwed;

        console.log(`🏢 Client: ${user.client_name}`);
        console.log(`🔑 Key: ${user.secret_api_key.substring(0, 12)}...`);
        console.log(`📊 Total System Requests: ${user.tokens_used}`);
        console.log(`💵 Rate: $${COST_PER_CALL.toFixed(2)} per execution`);
        console.log(`💰 INVOICE TOTAL OWED: $${totalOwed.toFixed(2)}`);
        console.log(`🟢 Status: ${user.subscription_status.toUpperCase()}`);
        console.log("----------------------------------------------------");
    });

    console.log("====================================================");
    console.log(`📈 PROJECTED MONTHLY BUSINESS REVENUE: $${totalProjectedRevenue.toFixed(2)}`);
    console.log("====================================================\n");
}

processMonthlyBilling();
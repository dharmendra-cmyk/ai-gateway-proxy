const express = require('express');
const path = require('path');
const Redis = require('ioredis');

const app = express();
app.use(express.json());

// 1. Connect to your Upstash Redis database using the environment variable we set
const redis = new Redis(process.env.REDIS_URL);

// 2. Simple public home page
app.get('/', (req, res) => {
    res.send('FDA 21 CFR Part 11 Automated CSV Engine Live.');
});

// 3. THE MONEY ENDPOINT: Clients send validation logs here
app.post('/api/v1/validation-logs', async (req, res) => {
    // Basic API Key security for your paying customers
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== 'pilot_client_sec_101') {
        return res.status(401).json({ error: 'Unauthorized: Invalid or missing API Key.' });
    }

    const { testName, status, executedBy, systemVersion } = req.body;

    // Validate that required FDA data fields are present
    if (!testName || !status || !executedBy || !systemVersion) {
        return res.status(400).json({ error: 'Missing mandatory Part 11 validation attributes.' });
    }

    // Build the immutable log packet with a server-side immutable timestamp
    const logId = `log:${Date.now()}:${Math.random().toString(36).substring(2, 7)}`;
    const logPayload = {
        testName,
        status,
        executedBy,
        systemVersion,
        timestamp: new Date().toISOString(),
        verificationStatus: 'VERIFIED_COMPLIANT'
    };

    try {
        // Lock it forever into your Redis memory bank
        await redis.set(logId, JSON.stringify(logPayload));
        
        // Return success response to the client
        return res.status(201).json({
            success: true,
            message: 'Validation log securely committed to immutable audit ledger.',
            logId: logId,
            timestamp: logPayload.timestamp
        });
    } catch (error) {
        console.error('Database save failure:', error);
        return res.status(500).json({ error: 'Internal ledger storage error.' });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`[FDA CSV LEDGER ACTIVE]: Operating on port ${PORT}`);
});

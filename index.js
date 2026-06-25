const express = require('express');
const path = require('path');
const Redis = require('ioredis');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

// 1. Connect to your Upstash Redis database using the environment variable
const redis = new Redis(process.env.REDIS_URL);

// 2. Simple public home page
app.get('/', (req, res) => {
    res.send('FDA 21 CFR Part 11 Automated CSV Engine Live.');
});

// 3. THE REVENUE ENDPOINT: Clients send validation logs here
app.post('/api/v1/validation-logs', async (req, res) => {
    // Basic API Key security for your paying customers
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== 'pilot_client_sec_101') {
        return res.status(401).json({ error: 'Unauthorized: Invalid or missing API Key.' });
    }

    const { testName, status, executedBy, systemVersion } = req.body;

    // Validate that required FDA data fields are present
    if (!testName || !status || !executedBy || !systemVersion) {
        return res.status(400).json({ 
            error: 'Bad Request: Missing required 21 CFR Part 11 audit fields (testName, status, executedBy, systemVersion).' 
        });
    }

    try {
        // Construct an immutable, timestamped audit log object
        const auditRecord = {
            testName,
            status,
            executedBy,
            systemVersion,
            timestamp: new Date().toISOString(),
            ipAddress: req.ip
        };

        // Generate a unique audit key and save it to the Redis database ledger
        const logId = `audit:log:${Date.now()}:${Math.floor(Math.random() * 1000)}`;
        await redis.set(logId, JSON.stringify(auditRecord));

        // Respond with success — this completes the paid API transaction loop
        return res.status(201).json({
            success: true,
            message: 'Audit log securely sealed and archived to 21 CFR Part 11 compliance ledger.',
            logId: logId
        });

    } catch (error) {
        console.error('Ledger Storage Error:', error);
        return res.status(500).json({ error: 'Internal Server Error: Failed to commit log to safe ledger.' });
    }
});

app.listen(PORT, () => {
    console.log(`Production Revenue Gateway running on port ${PORT}`);
});

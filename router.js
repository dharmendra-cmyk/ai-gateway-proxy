const express = require('express');
const { createClient } = require('@supabase/supabase-client');
const { GoogleGenAI } = require('@google/genai');
const redis = require('redis');
const crypto = require('crypto');
const { Queue, Worker } = require('bullmq'); // 1. Import BullMQ components

const router = express.Router();

// Initialize Supabase & Gemini
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Initialize and Connect Redis Client (For Auth Caching)
const redisClient = redis.createClient({ url: 'redis://localhost:6379' });
redisClient.on('error', (err) => console.error('Redis Client Error:', err));
redisClient.connect().then(() => console.log('⚡ Connected to Redis Caching Layer beautifully!'));

// 2. Initialize the BullMQ Log Queue
const logQueue = new Queue('AuditLogs', {
    connection: { host: 'localhost', port: 6379 }
});

// 3. Initialize the Background Worker to process database writes out-of-band
const logWorker = new Worker('AuditLogs', async (job) => {
    const { client_id, incoming_message, classification, routing_target } = job.data;
    
    console.log(`📥 Background Worker popped job #${job.id}: Writing log to Supabase...`);
    
    const { error } = await supabase.from('gateway_logs').insert([{
        client_id,
        incoming_message,
        classification,
        routing_target
    }]);

    if (error) {
        console.error(`❌ Background logging failed for job ${job.id}:`, error);
        throw error; // BullMQ automatically handles retries if this throws!
    }
    console.log(`✅ Job #${job.id} cleanly synced to Supabase!`);
}, {
    connection: { host: 'localhost', port: 6379 }
});

logWorker.on('failed', (job, err) => console.error(`🚨 Job ${job.id} permanently failed:`, err));

// ... Keep your hashApiKey, gatekeeper, rateLimiter, /analytics, and key generation code completely identical ...

// 4. UPDATED: Blazing Fast API Classification Route
router.post('/classify', gatekeeper, rateLimiter, async (req, res) => {
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ status: 'error', message: 'Message payload is required.' });
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Classify the urgency of this message as exactly one lowercase word: 'urgent' or 'routine'. Message: "${message}"`
        });

        const classification = response.text.trim().toLowerCase();
        const routingTarget = classification === 'urgent' ? 'PV Escalation Queue' : 'Standard Support Queue';

        // --- PRODUCTION UPGRADE: Instantly hand off logging data to Redis Queue ---
        await logQueue.add('saveLog', {
            client_id: req.clientData.id,
            incoming_message: message,
            classification: classification,
            routing_target: routingTarget
        });
        console.log('🚀 Log offloaded to Redis background stream.');

        // Respond to user IMMEDIATELY without waiting for Supabase database disk I/O!
        res.status(200).json({
            status: 'success',
            data: { receivedMessage: message, classification, routingTarget, processedBy: 'Gemini 2.5 Flash' }
        });
    } catch (err) {
        console.error('Classification error:', err);
        res.status(500).json({ status: 'error', message: 'Inference gateway failure.' });
    }
});

module.exports = router;
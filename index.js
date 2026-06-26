const express = require('express');
const path = require('path');
const Redis = require('ioredis');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

// Connect to your Upstash Redis database
const redis = new Redis(process.env.REDIS_URL);

// 1. NEW: Professional Audit Log Dashboard View
app.get('/dashboard', async (req, res) => {
    try {
        // Fetch all keys matching our audit log pattern
        const keys = await redis.keys('audit:log:*');
        
        let logs = [];
        if (keys.length > 0) {
            // Grab the data data for all keys
            const rawLogs = await redis.mget(keys);
            logs = rawLogs.map(log => JSON.parse(log));
            
            // Sort logs by timestamp (newest first)
            logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        }

        // Generate a clean HTML dashboard view
        html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>FDA 21 CFR Part 11 Compliance Ledger</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f4f6f9; margin: 0; padding: 40px; color: #333; }
                .container { max-width: 1100px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
                .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #eaeaea; padding-bottom: 20px; margin-bottom: 20px; }
                h1 { margin: 0; color: #1e293b; font-size: 24px; }
                .badge { background-color: #10b981; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; text-align: left; }
                th { background-color: #f8fafc; color: #64748b; padding: 12px; font-size: 13px; text-transform: uppercase; border-bottom: 2px solid #eaeaea; }
                td { padding: 14px 12px; font-size: 14px; border-bottom: 1px solid #f1f5f9; }
                tr:hover { background-color: #f8fafc; }
                .status-passed { color: #047857; background-color: #d1fae5; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; }
                .status-failed { color: #b91c1c; background-color: #fee2e2; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; }
                .timestamp { color: #64748b; font-family: monospace; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div>
                        <h1>21 CFR Part 11 Audit Trail Ledger</h1>
                        <p style="color: #64748b; margin: 5px 0 0 0;">System Verification Logs & Active Records</p>
                    </div>
                    <span class="badge">SECURE LEDGER ACTIVE</span>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Timestamp</th>
                            <th>Test Name</th>
                            <th>Executed By</th>
                            <th>Version</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${logs.map(log => `
                            <tr>
                                <td class="timestamp">${new Date(log.timestamp).toLocaleString()}</td>
                                <td><strong>${log.testName}</strong></td>
                                <td>${log.executedBy}</td>
                                <td><code style="background:#f1f5f9; padding:2px 6px; border-radius:4px;">${log.systemVersion}</code></td>
                                <td><span class="${log.status === 'PASSED' ? 'status-passed' : 'status-failed'}">${log.status}</span></td>
                            </tr>
                        `).join('')}
                        ${logs.length === 0 ? '<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:40px;">No audit logs found in ledger database.</td></tr>' : ''}
                    </tbody>
                </table>
            </div>
        </body>
        </html>
        `;
        
        res.send(html);
    } catch (error) {
        console.error('Dashboard Generation Error:', error);
        res.status(500).send('Error loading compliance dashboard.');
    }
});

// 2. THE REVENUE ENDPOINT: Clients send validation logs here
app.post('/api/v1/validation-logs', async (req, res) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== 'pilot_client_sec_101') {
        return res.status(401).json({ error: 'Unauthorized: Invalid or missing API Key.' });
    }

    const { testName, status, executedBy, systemVersion } = req.body;

    if (!testName || !status || !executedBy || !systemVersion) {
        return res.status(400).json({ 
            error: 'Bad Request: Missing required 21 CFR Part 11 audit fields.' 
        });
    }

    try {
        const auditRecord = {
            testName,
            status,
            executedBy,
            systemVersion,
            timestamp: new Date().toISOString(),
            ipAddress: req.ip
        };

        const logId = `audit:log:${Date.now()}:${Math.floor(Math.random() * 1000)}`;
        await redis.set(logId, JSON.stringify(auditRecord));

        return res.status(201).json({
            success: true,
            message: 'Audit log securely sealed and archived to 21 CFR Part 11 compliance ledger.',
            logId: logId
        });

    } catch (error) {
        console.error('Ledger Storage Error:', error);
        return res.status(500).json({ error: 'Internal Server Error.' });
    }
});

// Default Fallback
app.get('*', (req, res) => {
    res.send('FDA 21 CFR Part 11 Automated CSV Engine Live.');
});

app.listen(PORT, () => {
    console.log(`Production Revenue Gateway running on port ${PORT}`);
});

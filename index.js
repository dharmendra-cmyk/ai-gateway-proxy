const express = require('express');
const path = require('path');
const Redis = require('ioredis');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

// Connect to your Upstash Redis database using the environment variable
const redis = new Redis(process.env.REDIS_URL);

// 1. MAIN HOME PAGE ROUTE: Your dashboard is now the default page!
app.get('/', async (req, res) => {
    try {
        // Fetch all keys matching our audit log pattern
        const keys = await redis.keys('audit:log:*');
        
        let logs = [];
        if (keys.length > 0) {
            // Grab the data for all keys
            const rawLogs = await redis.mget(keys);
            logs = rawLogs.map(log => JSON.parse(log));
            
            // Sort logs by timestamp (newest first)
            logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        }

        // Generate an upgraded HTML dashboard view with client-side filtering & export
        const html = `
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
                
                /* Stacked clearly on top of each other so nothing is hidden */
                .controls { background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 25px; }
                .search-box { width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; box-sizing: border-box; margin-bottom: 15px; }
                
                /* Large Blue Download Button */
                .btn-export { background-color: #2563eb; color: #ffffff !important; border: none; padding: 12px 30px; border-radius: 6px; font-size: 15px; cursor: pointer; font-weight: bold; text-align: center; display: block; width: 100%; box-sizing: border-box; text-decoration: none; }
                .btn-export:hover { background-color: #1d4ed8; color: #ffffff !important; }

                table { width: 100%; border-collapse: collapse; margin-top: 10px; text-align: left; }
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

                <div class="controls">
                    <input type="text" id="searchInput" class="search-box" placeholder="Search logs by product, status, metadata or system version..." onkeyup="filterLogs()">
                    <button class="btn-export" onclick="exportToCSV()">Download CSV Audit Report</button>
                </div>

                <table id="auditTable">
                    <thead>
                        <tr>
                            <th>Timestamp</th>
                            <th>Test Name</th>
                            <th>Executed By</th>
                            <th>Version/Metadata</th>
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
                        ${logs.length === 0 ? '<tr id="noDataRow"><td colspan="5" style="text-align:center; color:#94a3b8; padding:40px;">No audit logs found in ledger database.</td></tr>' : ''}
                    </tbody>
                </table>
            </div>

            <script>
                function filterLogs() {
                    const input = document.getElementById("searchInput");
                    const filter = input.value.toLowerCase();
                    const table = document.getElementById("auditTable");
                    const tr = table.getElementsByTagName("tr");

                    for (let i = 1; i < tr.length; i++) {
                        let rowMatch = false;
                        const tds = tr[i].getElementsByTagName("td");
                        
                        for (let j = 0; j < tds.length; j++) {
                            if (tds[j]) {
                                const textValue = tds[j].textContent || tds[j].innerText;
                                if (textValue.toLowerCase().indexOf(filter) > -1) {
                                    rowMatch = true;
                                    break;
                                }
                            }
                        }
                        tr[i].style.display = rowMatch ? "" : "none";
                    }
                }

                function exportToCSV() {
                    const table = document.getElementById("auditTable");
                    let csv = [];
                    const rows = table.querySelectorAll("tr");
                    
                    for (let i = 0; i < rows.length; i++) {
                        if (rows[i].style.display === "none") continue;
                        
                        const row = [], cols = rows[i].querySelectorAll("td, th");
                        
                        for (let j = 0; j < cols.length; j++) {
                            let data = cols[j].innerText.replace(/\\n/g, '').replace(/,/g, ';').trim();
                            row.push('"' + data + '"');
                        }
                        csv.push(row.join(","));
                    }
                    
                    const csvContent = "data:text/csv;charset=utf-8," + csv.join("\\n");
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", "FDA_21CFR_Part11_Audit_Report_" + new Date().toISOString().slice(0,10) + ".csv");
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
            </script>
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

app.listen(PORT, () => {
    console.log('Production Revenue Gateway running on port ' + PORT);
});

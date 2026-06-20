// 1. Catch Malformed JSON Payloads automatically
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ 
            error: "Invalid JSON format. Please check your request structure." 
        });
    }
    next();
});

// 2. Wrap your route in a try/catch block to handle Supabase or n8n timeouts
app.post('/api/v1/execute', async (req, res) => {
    try {
        const apiKey = req.headers['x-api-key'];
        
        // Your existing Supabase verification code...
        if (!isValidKey) {
            return res.status(401).json({ error: "Unauthorized: Invalid API Key." });
        }

        // Trigger n8n with a timeout safety net
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            body: JSON.stringify(req.body),
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        // Success tracking...
        res.status(200).json({ status: "success", data: await response.json() });

    } catch (error) {
        if (error.name === 'AbortError') {
            return res.status(504).json({ error: "Gateway Timeout: Automation engine took too long to respond." });
        }
        console.error("Internal Server Error:", error);
        res.status(500).json({ error: "Internal Server Error. Our team has been notified." });
    }
});

Welcome to your secure, enterprise-grade message classification gateway. This document details how to integrate your internal applications with our high-performance automation engine.

## 1. Authentication
All API requests must be authenticated by including your secret token inside the HTTP header as `x-api-key`. 

* **Your Assigned Secret Key:** `sk_live_8cd3d8033878b277ffb2c65fe368db55`
* **Base URL:** `http://localhost:3000`

> ⚠️ **Security Warning:** Keep your API key private. Do not share it or hardcode it into public frontend code repositories.

## 2. Live Operational Endpoint

### Post Message Payload
Submit a JSON body to the processing route to instantly verify facts, perform sequential validation, and triage message streams.

* **Endpoint:** `/api/v1/execute`
* **Method:** `POST`
* **Headers:**
  * `Content-Type: application/json`
  * `x-api-key: YOUR_SECRET_API_KEY`

### Request Structure Example
```json
{
  "message_id": "REQ-10029",
  "message_text": "Please parse and categorize this incoming corporate data payload."
}
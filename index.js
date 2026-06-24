const express = require('express');
const path = require('path');
const app = express();

// Parse incoming JSON requests
app.use(express.json());

// Serving static files if you have a public folder
app.use(express.static(path.join(__dirname, 'public')));

// Simple test route to verify the gateway is working
app.get('/', (req, res) => {
    res.send('AI Gateway Proxy is running successfully!');
});

// Start the server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`[BUSINESS GATEWAY RUNNING]: Listening on port ${PORT}`);
});

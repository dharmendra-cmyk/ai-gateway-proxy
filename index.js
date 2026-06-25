const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());

// Main Health Check Route
app.get('/', (req, res) => {
    res.send('FDA 21 CFR Part 11 Automated CSV Engine Live.');
});

// n8n Webhook / Proxy Target Route
app.post('/webhook', (req, res) => {
    console.log('Validation Data Received:', req.body);
    res.status(200).json({ status: 'success', message: 'Log registered' });
});

app.listen(PORT, () => {
    console.log(`Proxy Gateway listening on port ${PORT}`);
});

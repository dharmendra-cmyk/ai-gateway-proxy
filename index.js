const express = require('express');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Parse incoming JSON payloads
app.use(express.json());

// 2. CRUCIAL: Serve your static frontend files from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// 3. Import and link your API router matrix
const gatewayRouter = require('./router');
app.use('/api', gatewayRouter);

// Start the gateway engine
app.listen(PORT, () => {
    console.log(`Server is running beautifully on http://localhost:${PORT}`);
});
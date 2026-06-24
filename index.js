const express = require('express');
const path = require('path');
const app = express(); // <-- This line must exist before app.use()!

app.use(express.static(path.join(__dirname, 'public')));
// ... rest of your code

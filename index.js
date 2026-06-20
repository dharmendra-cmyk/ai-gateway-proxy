// Ensure there are TWO underscores before dirname here:
app.use(express.static(path.join(__dirname, 'public')));

// Ensure there are TWO underscores before dirname here too:
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
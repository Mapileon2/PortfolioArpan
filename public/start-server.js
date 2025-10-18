const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3013; // Use 3013 to avoid conflicts

// Serve static files
app.use(express.static(__dirname));

// CORS headers for development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Routes
app.get('/', (req, res) => {
    res.redirect('/admin-dashboard.html');
});

app.get('/admin-dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-dashboard.html'));
});

app.get('/carousel', (req, res) => {
    res.redirect('/admin-dashboard.html#carousel');
});

app.get('/content', (req, res) => {
    res.redirect('/admin-dashboard.html#content');
});

app.get('/projects', (req, res) => {
    res.redirect('/admin-dashboard.html#projects');
});

app.get('/settings', (req, res) => {
    res.redirect('/admin-dashboard.html#settings');
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        port: PORT,
        message: 'Portfolio Admin Server is running'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Portfolio Admin Server started successfully!`);
    console.log(`📊 Admin Dashboard: http://localhost:${PORT}/admin-dashboard.html`);
    console.log(`🎠 Carousel: http://localhost:${PORT}/admin-dashboard.html#carousel`);
    console.log(`📝 Content: http://localhost:${PORT}/admin-dashboard.html#content`);
    console.log(`📁 Projects: http://localhost:${PORT}/admin-dashboard.html#projects`);
    console.log(`⚙️ Settings: http://localhost:${PORT}/admin-dashboard.html#settings`);
    console.log(`🧪 Tests: http://localhost:${PORT}/comprehensive-functionality-test.html`);
    console.log(`\n✅ Server is ready! Open any of the URLs above to start testing.`);
});

// Error handling
app.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`❌ Port ${PORT} is already in use. Trying port ${PORT + 1}...`);
        app.listen(PORT + 1);
    } else {
        console.error('Server error:', err);
    }
});

process.on('SIGINT', () => {
    console.log('\n🛑 Server shutting down gracefully...');
    process.exit(0);
});
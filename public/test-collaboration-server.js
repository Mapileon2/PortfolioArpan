/**
 * Test Server for Collaboration System
 * Simple Express server to test collaboration features
 */

const express = require('express');
const http = require('http');
const path = require('path');
const { router: collaborationRouter, initializeWebSocketServer } = require('./api/collaboration');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('.'));

// Routes
app.use('/api/collaboration', collaborationRouter);

// Serve test page
app.get('/test-collaboration', (req, res) => {
    res.sendFile(path.join(__dirname, 'test-collaboration-system.html'));
});

// Initialize WebSocket server
initializeWebSocketServer(server);

// Start server
server.listen(PORT, () => {
    console.log(`🚀 Collaboration test server running on http://localhost:${PORT}`);
    console.log(`📝 Test page: http://localhost:${PORT}/test-collaboration`);
    console.log(`🔌 WebSocket endpoint: ws://localhost:${PORT}/ws/collaboration`);
});

module.exports = { app, server };
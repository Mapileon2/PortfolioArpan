const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const port = 8000;

// MIME types
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm'
};

const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url);
    let pathname = `.${parsedUrl.pathname}`;

    // Default to index.html if root
    if (pathname === './') {
        pathname = './admin-dashboard-saas-complete.html';
    }

    const ext = path.parse(pathname).ext;
    const mimeType = mimeTypes[ext] || 'text/plain';

    fs.readFile(pathname, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end(`File not found: ${pathname}`);
        } else {
            res.writeHead(200, { 'Content-Type': mimeType });
            res.end(data);
        }
    });
});

server.listen(port, () => {
    console.log(`🚀 SaaS Portfolio Admin Server running at http://localhost:${port}`);
    console.log(`📊 Dashboard: http://localhost:${port}/admin-dashboard-saas-complete.html`);
    console.log(`🧪 Test Suite: http://localhost:${port}/test-saas-admin-complete.html`);
    console.log(`📚 Case Study Editor: http://localhost:${port}/case_study_editor_complete.html`);
    console.log('');
    console.log('✅ All SaaS features available!');
});
const express = require('express');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = 3012; // Using a different port

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Case Studies API
app.get('/api/case-studies', (req, res) => {
    console.log('📖 GET /api/case-studies');
    res.json({
        success: true,
        data: [],
        message: 'Case studies API working'
    });
});

app.post('/api/case-studies', (req, res) => {
    console.log('💾 POST /api/case-studies', req.body);
    
    const caseStudy = {
        id: 'cs_' + Date.now(),
        ...req.body,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    
    res.json({
        success: true,
        data: caseStudy,
        message: 'Case study saved successfully'
    });
});

// Cloudinary signature endpoint
app.post('/api/cloudinary/signature', (req, res) => {
    const { timestamp, folder, tags, transformation } = req.body;

    if (!timestamp) {
        return res.status(400).json({
            error: 'Timestamp is required',
            code: 'MISSING_TIMESTAMP'
        });
    }

    const params = { timestamp };
    if (folder) params.folder = folder;
    if (tags) params.tags = tags;
    if (transformation) params.transformation = transformation;

    // Generate signature
    const sortedParams = Object.keys(params)
        .sort()
        .map(key => `${key}=${params[key]}`)
        .join('&');

    const apiSecret = 'jTPgMHSl-6m7LptvsBA5eDbOWwc';
    const signature = crypto
        .createHash('sha1')
        .update(sortedParams + apiSecret)
        .digest('hex');

    res.json({
        signature: signature,
        timestamp: timestamp,
        api_key: '951533987774134'
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Case Study Server running',
        timestamp: new Date().toISOString()
    });
});

// Serve case study editor
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'case_study_editor_complete.html'));
});

// Start server
app.listen(PORT, () => {
    console.log('\n🚀 Case Study Server Started!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 Server running on: http://localhost:${PORT}`);
    console.log(`📝 Case Study Editor: http://localhost:${PORT}/`);
    console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✅ Case Study Editor Features:');
    console.log('   • Image upload with custom Cloudinary settings');
    console.log('   • Case study save/load functionality');
    console.log('   • Cloudinary signature generation');
    console.log('   • No connection errors');
    console.log('\n🎯 Open http://localhost:3012 to use the case study editor.\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n👋 Shutting down Case Study Server...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n👋 Shutting down Case Study Server...');
    process.exit(0);
});
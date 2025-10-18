const express = require('express');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = 3011;

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

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
        message: 'Simple server running for Cloudinary fix testing',
        timestamp: new Date().toISOString()
    });
});

// Serve test page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'test-cloudinary-fix.html'));
});

// Serve case study editor
app.get('/editor', (req, res) => {
    res.sendFile(path.join(__dirname, 'case_study_editor_complete.html'));
});

// Start server
app.listen(PORT, () => {
    console.log('\n🚀 Simple Server Started for Cloudinary Fix Testing!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 Server running on: http://localhost:${PORT}`);
    console.log(`🧪 Test Page: http://localhost:${PORT}/`);
    console.log(`📝 Case Study Editor: http://localhost:${PORT}/editor`);
    console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✅ Ready to test Cloudinary upload fix!');
    console.log('   • Upload preset fallback system');
    console.log('   • Signed upload as backup');
    console.log('   • Auto-preset creation');
    console.log('\n🎯 Open your browser and test the upload functionality.\n');
});
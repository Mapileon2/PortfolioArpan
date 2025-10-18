const express = require('express');
const path = require('path');

const app = express();
const PORT = 3011;

// Serve static files
app.use(express.static(__dirname));

// Main route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'working-carousel-demo.html'));
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Simple Carousel Server is running' });
});

app.listen(PORT, () => {
    console.log('\n🎠 Simple Carousel Server Started!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 Server running on: http://localhost:${PORT}`);
    console.log(`🎯 Working Carousel: http://localhost:${PORT}/`);
    console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✅ Features Available:');
    console.log('   • Working image carousel with sample images');
    console.log('   • Drag & drop file upload');
    console.log('   • Image management (edit/delete)');
    console.log('   • Carousel navigation (arrows, dots)');
    console.log('   • Responsive design');
    console.log('\n🎉 The carousel is NOT empty - it has sample images!\n');
});
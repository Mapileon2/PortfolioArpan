const express = require('express');
const path = require('path');

const app = express();
const PORT = 3012;

// Serve static files
app.use(express.static(__dirname));

// Admin dashboard route
app.get('/admin-dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-dashboard.html'));
});

// Root route redirects to admin dashboard
app.get('/', (req, res) => {
    res.redirect('/admin-dashboard.html');
});

// Working carousel demo
app.get('/carousel-demo', (req, res) => {
    res.sendFile(path.join(__dirname, 'working-carousel-demo.html'));
});

// Complete image management system
app.get('/complete-system', (req, res) => {
    res.sendFile(path.join(__dirname, 'complete-image-management-system.html'));
});

// Image resizer demo
app.get('/resizer', (req, res) => {
    res.sendFile(path.join(__dirname, 'image-resizer-demo.html'));
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Admin Dashboard Server is running',
        routes: {
            dashboard: '/admin-dashboard.html',
            carouselDemo: '/carousel-demo',
            completeSystem: '/complete-system',
            health: '/health'
        }
    });
});

// Mock API endpoints for admin dashboard
app.get('/api/carousel/images', (req, res) => {
    res.json({
        success: true,
        data: [
            {
                id: 'sample1',
                url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop',
                title: 'Sample Carousel Image 1',
                description: 'Beautiful landscape showcase',
                thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=300&h=200&fit=crop'
            },
            {
                id: 'sample2',
                url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop',
                title: 'Sample Carousel Image 2',
                description: 'Modern technology display',
                thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=300&h=200&fit=crop'
            },
            {
                id: 'sample3',
                url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=400&fit=crop',
                title: 'Sample Carousel Image 3',
                description: 'Creative workspace environment',
                thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=300&h=200&fit=crop'
            }
        ]
    });
});

app.get('/api/projects', (req, res) => {
    res.json([
        { id: 1, title: 'E-commerce Platform', status: 'active' },
        { id: 2, title: 'Mobile Banking App', status: 'development' }
    ]);
});

app.get('/api/case-studies', (req, res) => {
    res.json([
        { id: 1, title: 'UX Redesign Project', status: 'published' },
        { id: 2, title: 'Mobile App Design', status: 'draft' }
    ]);
});

app.listen(PORT, () => {
    console.log('\n🎛️ Admin Dashboard Server Started!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 Server running on: http://localhost:${PORT}`);
    console.log(`🎯 Admin Dashboard: http://localhost:${PORT}/admin-dashboard.html`);
    console.log(`🎠 Carousel Section: http://localhost:${PORT}/admin-dashboard.html#carousel`);
    console.log(`🧪 Carousel Demo: http://localhost:${PORT}/carousel-demo`);
    console.log(`🔧 Complete System: http://localhost:${PORT}/complete-system`);
    console.log(`🖼️ Image Resizer: http://localhost:${PORT}/resizer`);
    console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✅ Features Available:');
    console.log('   • Complete admin dashboard with all sections');
    console.log('   • Working carousel management');
    console.log('   • Mock API endpoints for testing');
    console.log('   • Static file serving');
    console.log('   • Hash fragment support (#carousel)');
    console.log('\n🎉 Try: http://localhost:3012/admin-dashboard.html#carousel\n');
});
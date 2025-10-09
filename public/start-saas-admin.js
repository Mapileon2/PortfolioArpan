#!/usr/bin/env node

/**
 * SaaS Admin Dashboard Startup Script
 * Launches the complete SaaS portfolio admin system
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3005;

// Middleware
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.static(__dirname));

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'SaaS Admin Dashboard is running',
        timestamp: new Date().toISOString(),
        features: [
            'Projects Management',
            'Case Studies Editor',
            'Analytics Dashboard',
            'User Management',
            'API Keys',
            'Billing System',
            'Support Tickets',
            'Integrations Hub'
        ]
    });
});

// Cloudinary signature endpoint
app.post('/api/cloudinary/signature', (req, res) => {
    const crypto = require('crypto');
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

    const apiSecret = process.env.CLOUDINARY_API_SECRET || 'jTPgMHSl-6m7LptvsBA5eDbOWwc';
    const signature = crypto
        .createHash('sha1')
        .update(sortedParams + apiSecret)
        .digest('hex');

    res.json({
        signature: signature,
        timestamp: timestamp,
        api_key: process.env.CLOUDINARY_API_KEY || '951533987774134'
    });
});

// Cloudinary config endpoint
app.get('/api/cloudinary/config', (req, res) => {
    res.json({
        cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'dgymjtqil',
        apiKey: process.env.CLOUDINARY_API_KEY || '951533987774134',
        uploadPreset: 'ml_default'
    });
});

// Load API routes if they exist
try {
    const cloudinaryV2Routes = require('./api/cloudinary-v2');
    app.use('/api/cloudinary', cloudinaryV2Routes);
    console.log('✅ Cloudinary v2 routes loaded');
} catch (e) {
    console.log('⚠️ Cloudinary v2 routes not found, using basic endpoints');
}

try {
    const carouselRoutes = require('./api/carousel');
    app.use('/api/carousel', carouselRoutes);
    console.log('✅ Carousel routes loaded');
} catch (e) {
    console.log('⚠️ Carousel routes not found, using mock endpoints');
}

// Mock carousel endpoints if routes not found
app.get('/api/carousel/images', (req, res) => {
    res.json({
        success: true,
        data: [
            {
                id: 'mock_1',
                public_id: 'portfolio/carousel/sample1',
                secure_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
                thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=300&h=200&fit=crop',
                title: 'Sample Carousel Image 1',
                description: 'This is a sample carousel image',
                width: 800,
                height: 600,
                bytes: 150000,
                is_active: true,
                order_index: 0,
                created_at: new Date().toISOString()
            }
        ]
    });
});

app.post('/api/carousel/images', (req, res) => {
    res.json({
        success: true,
        message: 'Carousel image saved successfully (mock)',
        data: req.body
    });
});

app.post('/api/carousel/order', (req, res) => {
    res.json({
        success: true,
        message: 'Carousel order updated successfully (mock)'
    });
});

// Mock case study endpoints
app.get('/api/case-studies/:id/images', (req, res) => {
    res.json({
        success: true,
        data: {
            images: {
                hero: null,
                gallery: [],
                process: [],
                results: []
            }
        }
    });
});

app.post('/api/case-studies/images', (req, res) => {
    res.json({
        success: true,
        message: 'Case study images saved successfully (mock)'
    });
});

// API endpoints for demo
app.get('/api/dashboard/stats', (req, res) => {
    res.json({
        totalProjects: 12,
        totalCaseStudies: 8,
        totalPageViews: 2456,
        activeUsers: 156,
        recentActivity: [
            { action: 'New project created', time: '2 hours ago', type: 'project' },
            { action: 'Case study published', time: '5 hours ago', type: 'case-study' },
            { action: 'User invited', time: '1 day ago', type: 'user' },
            { action: 'Backup completed', time: '2 days ago', type: 'system' }
        ]
    });
});

app.get('/api/projects', (req, res) => {
    res.json([
        {
            id: '1',
            title: 'E-commerce Platform',
            description: 'Modern e-commerce solution with React and Node.js',
            image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400',
            status: 'published',
            created: new Date().toISOString()
        },
        {
            id: '2',
            title: 'Mobile Banking App',
            description: 'Secure mobile banking application with biometric auth',
            image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400',
            status: 'draft',
            created: new Date().toISOString()
        }
    ]);
});

app.get('/api/analytics', (req, res) => {
    res.json({
        pageViews: 2456,
        uniqueVisitors: 567,
        bounceRate: 45.2,
        avgSessionDuration: 180,
        topPages: [
            { page: '/', views: 456, percentage: 37 },
            { page: '/projects', views: 234, percentage: 19 },
            { page: '/about', views: 123, percentage: 10 }
        ],
        trafficSources: [
            { source: 'Direct', visitors: 234, percentage: 41 },
            { source: 'Google', visitors: 156, percentage: 28 },
            { source: 'Social Media', visitors: 89, percentage: 16 }
        ]
    });
});

app.get('/api/users', (req, res) => {
    res.json([
        {
            id: '1',
            name: 'John Doe',
            email: 'john@example.com',
            role: 'admin',
            status: 'active',
            lastLogin: new Date().toISOString(),
            avatar: 'https://via.placeholder.com/40'
        },
        {
            id: '2',
            name: 'Jane Smith',
            email: 'jane@example.com',
            role: 'editor',
            status: 'active',
            lastLogin: new Date(Date.now() - 86400000).toISOString(),
            avatar: 'https://via.placeholder.com/40'
        }
    ]);
});

// Serve the main SaaS admin dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-dashboard-saas-complete.html'));
});

// Serve test page
app.get('/test', (req, res) => {
    res.sendFile(path.join(__dirname, 'test-saas-admin-complete.html'));
});

// Serve case study editor
app.get('/case-studies', (req, res) => {
    res.sendFile(path.join(__dirname, 'case_study_editor_complete.html'));
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Page not found',
        availableRoutes: [
            '/ - SaaS Admin Dashboard',
            '/test - Feature Test Page',
            '/case-studies - Case Study Editor',
            '/health - Health Check'
        ]
    });
});

// Start server
app.listen(PORT, () => {
    console.log('\n🚀 SaaS Portfolio Admin Dashboard Started!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 Server running on: http://localhost:${PORT}`);
    console.log(`🎯 Admin Dashboard: http://localhost:${PORT}/`);
    console.log(`🧪 Feature Tests: http://localhost:${PORT}/test`);
    console.log(`📝 Case Studies: http://localhost:${PORT}/case-studies`);
    console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✅ All SaaS Features Available:');
    console.log('   • Projects Management');
    console.log('   • Case Studies Editor');
    console.log('   • Analytics Dashboard');
    console.log('   • User Management');
    console.log('   • API Key Management');
    console.log('   • Billing System');
    console.log('   • Support Tickets');
    console.log('   • Integrations Hub');
    console.log('   • Security Features');
    console.log('   • Mobile Responsive');
    console.log('\n🎉 Ready to use! Open your browser and start managing your portfolio.\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n👋 Shutting down SaaS Admin Dashboard...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n👋 Shutting down SaaS Admin Dashboard...');
    process.exit(0);
});
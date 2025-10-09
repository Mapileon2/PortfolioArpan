/**
 * Enterprise SaaS Server - Portfolio Management System
 * Senior Software Engineer Implementation
 * Complete backend integration with Supabase, Cloudinary, JWT Auth
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');

// Import API routes
const authRoutes = require('./api/auth');
const caseStudyRoutes = require('./api/case-studies');
const uploadRoutes = require('./api/upload');

const app = express();
const PORT = process.env.PORT || 3003;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdn.jsdelivr.net", "https://upload-widget.cloudinary.com"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            connectSrc: ["'self'", "https:", "wss:"]
        }
    }
}));

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? process.env.ALLOWED_ORIGINS?.split(',') 
        : ['http://localhost:3003', 'http://127.0.0.1:3003'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Compression middleware
app.use(compression());

// Request logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global rate limiting
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.',
        code: 'GLOBAL_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false
});
app.use(globalLimiter);

// Static file serving
app.use(express.static(path.join(__dirname), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
    etag: true
}));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/case-studies', caseStudyRoutes);
app.use('/api/upload', uploadRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    // Multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
            error: 'File too large',
            code: 'FILE_TOO_LARGE'
        });
    }
    
    if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(413).json({
            error: 'Too many files',
            code: 'TOO_MANY_FILES'
        });
    }
    
    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: 'Invalid token',
            code: 'INVALID_TOKEN'
        });
    }
    
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            error: 'Token expired',
            code: 'TOKEN_EXPIRED'
        });
    }
    
    // Default error
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : err.message,
        code: 'INTERNAL_ERROR'
    });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        error: 'API endpoint not found',
        code: 'ENDPOINT_NOT_FOUND'
    });
});

// Serve frontend files
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 SaaS Portfolio Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`📝 API docs: http://localhost:${PORT}/api`);
});
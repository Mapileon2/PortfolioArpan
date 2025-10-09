/**
 * Cloudinary Signature Generation API
 * Provides secure server-side signature generation for Cloudinary uploads
 */

const express = require('express');
const crypto = require('crypto');
const router = express.Router();

// Cloudinary configuration
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || 'jTPgMHSl-6m7LptvsBA5eDbOWwc';

/**
 * POST /api/cloudinary/signature
 * Generate signature for Cloudinary upload
 */
router.post('/signature', async (req, res) => {
    try {
        const { timestamp, folder, tags, transformation } = req.body;

        // Validate required parameters
        if (!timestamp) {
            return res.status(400).json({
                error: 'Timestamp is required',
                code: 'MISSING_TIMESTAMP'
            });
        }

        // Create parameters object for signing
        const params = {
            timestamp: timestamp
        };

        // Add optional parameters
        if (folder) params.folder = folder;
        if (tags) params.tags = tags;
        if (transformation) params.transformation = transformation;

        // Generate signature
        const signature = generateCloudinarySignature(params, CLOUDINARY_API_SECRET);

        res.json({
            signature: signature,
            timestamp: timestamp,
            api_key: process.env.CLOUDINARY_API_KEY || '951533987774134'
        });

    } catch (error) {
        console.error('Signature generation error:', error);
        res.status(500).json({
            error: 'Failed to generate signature',
            code: 'SIGNATURE_ERROR'
        });
    }
});

/**
 * Generate Cloudinary signature using HMAC-SHA1
 */
function generateCloudinarySignature(params, apiSecret) {
    // Sort parameters alphabetically
    const sortedParams = Object.keys(params)
        .sort()
        .map(key => `${key}=${params[key]}`)
        .join('&');

    // Generate HMAC-SHA1 signature
    const signature = crypto
        .createHash('sha1')
        .update(sortedParams + apiSecret)
        .digest('hex');

    return signature;
}

/**
 * GET /api/cloudinary/config
 * Get Cloudinary configuration for client-side
 */
router.get('/config', (req, res) => {
    res.json({
        cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'dgymjtqil',
        apiKey: process.env.CLOUDINARY_API_KEY || '951533987774134',
        uploadPreset: 'ml_default' // Make sure this exists in your Cloudinary settings
    });
});

/**
 * POST /api/cloudinary/upload-preset
 * Create upload preset if it doesn't exist (admin only)
 */
router.post('/upload-preset', async (req, res) => {
    try {
        // This would typically require admin authentication
        // For demo purposes, we'll return instructions

        res.json({
            message: 'Upload preset creation instructions',
            instructions: [
                '1. Go to your Cloudinary Dashboard',
                '2. Navigate to Settings > Upload',
                '3. Scroll down to "Upload presets"',
                '4. Click "Add upload preset"',
                '5. Set name to "ml_default"',
                '6. Set signing mode to "Unsigned"',
                '7. Configure folder and other settings as needed',
                '8. Save the preset'
            ],
            preset_name: 'ml_default',
            settings: {
                unsigned: true,
                folder: 'portfolio',
                tags: 'portfolio,auto-upload',
                transformation: [
                    { quality: 'auto:good' },
                    { fetch_format: 'auto' }
                ]
            }
        });

    } catch (error) {
        console.error('Upload preset creation error:', error);
        res.status(500).json({
            error: 'Failed to create upload preset',
            code: 'PRESET_ERROR'
        });
    }
});

module.exports = router;
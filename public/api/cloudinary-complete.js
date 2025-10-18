/**
 * Complete Cloudinary API Endpoints
 * Server-side handlers for image operations
 */

const express = require('express');
const { v2: cloudinary } = require('cloudinary');
const multer = require('multer');
const router = express.Router();

// Configure Cloudinary
cloudinary.config({
    cloud_name: 'dgymjtqil',
    api_key: '951533987774134',
    api_secret: 'jTPgMHSl-6m7LptvsBA5eDbOWwc'
});

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

/**
 * POST /api/cloudinary/upload
 * Upload image to Cloudinary
 */
router.post('/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        console.log('📤 Uploading image to Cloudinary...');

        // Upload options
        const uploadOptions = {
            folder: req.body.folder || 'portfolio',
            public_id: req.body.publicId,
            tags: req.body.tags ? req.body.tags.split(',') : ['portfolio'],
            transformation: [
                { quality: 'auto', fetch_format: 'auto' }
            ]
        };

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
                if (error) {
                    console.error('❌ Cloudinary upload error:', error);
                    return res.status(500).json({ 
                        error: 'Upload failed', 
                        message: error.message 
                    });
                }

                console.log('✅ Upload successful:', result.public_id);
                res.json({
                    success: true,
                    data: {
                        publicId: result.public_id,
                        url: result.secure_url,
                        width: result.width,
                        height: result.height,
                        format: result.format,
                        bytes: result.bytes,
                        createdAt: result.created_at,
                        folder: result.folder,
                        tags: result.tags
                    }
                });
            }
        );

        // Pipe the file buffer to Cloudinary
        require('stream').Readable.from(req.file.buffer).pipe(result);

    } catch (error) {
        console.error('❌ Upload error:', error);
        res.status(500).json({ 
            error: 'Upload failed', 
            message: error.message 
        });
    }
});

/**
 * POST /api/cloudinary/delete
 * Delete image from Cloudinary
 */
router.post('/delete', async (req, res) => {
    try {
        const { publicId } = req.body;

        if (!publicId) {
            return res.status(400).json({ error: 'Public ID is required' });
        }

        console.log('🗑️ Deleting image:', publicId);

        const result = await cloudinary.uploader.destroy(publicId);

        if (result.result === 'ok') {
            console.log('✅ Image deleted successfully');
            res.json({ 
                success: true, 
                message: 'Image deleted successfully' 
            });
        } else {
            console.log('⚠️ Image not found or already deleted');
            res.json({ 
                success: false, 
                message: 'Image not found or already deleted' 
            });
        }

    } catch (error) {
        console.error('❌ Delete error:', error);
        res.status(500).json({ 
            error: 'Delete failed', 
            message: error.message 
        });
    }
});

/**
 * POST /api/cloudinary/signature
 * Generate upload signature for signed uploads
 */
router.post('/signature', (req, res) => {
    try {
        const { folder, publicId, tags } = req.body;
        
        const timestamp = Math.round(new Date().getTime() / 1000);
        
        const params = {
            timestamp,
            folder: folder || 'portfolio',
            ...(publicId && { public_id: publicId }),
            ...(tags && { tags: Array.isArray(tags) ? tags.join(',') : tags })
        };

        const signature = cloudinary.utils.api_sign_request(params, cloudinary.config().api_secret);

        res.json({
            signature,
            timestamp,
            apiKey: cloudinary.config().api_key,
            cloudName: cloudinary.config().cloud_name
        });

    } catch (error) {
        console.error('❌ Signature generation error:', error);
        res.status(500).json({ 
            error: 'Signature generation failed', 
            message: error.message 
        });
    }
});

/**
 * GET /api/cloudinary/search
 * Search images in Cloudinary
 */
router.get('/search', async (req, res) => {
    try {
        const { expression, maxResults = 50, nextCursor } = req.query;

        if (!expression) {
            return res.status(400).json({ error: 'Search expression is required' });
        }

        console.log('🔍 Searching images:', expression);

        const searchOptions = {
            expression,
            max_results: parseInt(maxResults),
            sort_by: [['created_at', 'desc']]
        };

        if (nextCursor) {
            searchOptions.next_cursor = nextCursor;
        }

        const result = await cloudinary.search
            .expression(expression)
            .max_results(parseInt(maxResults))
            .sort_by('created_at', 'desc')
            .execute();

        console.log(`✅ Found ${result.resources.length} images`);

        res.json({
            success: true,
            resources: result.resources,
            totalCount: result.total_count,
            nextCursor: result.next_cursor
        });

    } catch (error) {
        console.error('❌ Search error:', error);
        res.status(500).json({ 
            error: 'Search failed', 
            message: error.message 
        });
    }
});

/**
 * GET /api/cloudinary/resources
 * Get all resources from a folder
 */
router.get('/resources', async (req, res) => {
    try {
        const { folder = 'portfolio', maxResults = 50, nextCursor } = req.query;

        console.log('📁 Getting resources from folder:', folder);

        const options = {
            type: 'upload',
            prefix: folder,
            max_results: parseInt(maxResults)
        };

        if (nextCursor) {
            options.next_cursor = nextCursor;
        }

        const result = await cloudinary.api.resources(options);

        console.log(`✅ Found ${result.resources.length} resources`);

        res.json({
            success: true,
            resources: result.resources,
            nextCursor: result.next_cursor
        });

    } catch (error) {
        console.error('❌ Resources fetch error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch resources', 
            message: error.message 
        });
    }
});

/**
 * POST /api/cloudinary/transform
 * Apply transformations to existing image
 */
router.post('/transform', async (req, res) => {
    try {
        const { publicId, transformations } = req.body;

        if (!publicId) {
            return res.status(400).json({ error: 'Public ID is required' });
        }

        console.log('🔄 Applying transformations to:', publicId);

        // Generate transformed URL
        const transformedUrl = cloudinary.url(publicId, {
            ...transformations,
            secure: true
        });

        res.json({
            success: true,
            originalPublicId: publicId,
            transformedUrl,
            transformations
        });

    } catch (error) {
        console.error('❌ Transform error:', error);
        res.status(500).json({ 
            error: 'Transform failed', 
            message: error.message 
        });
    }
});

/**
 * POST /api/cloudinary/batch-delete
 * Delete multiple images
 */
router.post('/batch-delete', async (req, res) => {
    try {
        const { publicIds } = req.body;

        if (!Array.isArray(publicIds) || publicIds.length === 0) {
            return res.status(400).json({ error: 'Array of public IDs is required' });
        }

        console.log(`🗑️ Batch deleting ${publicIds.length} images`);

        const result = await cloudinary.api.delete_resources(publicIds);

        const deleted = Object.keys(result.deleted).filter(id => result.deleted[id] === 'deleted');
        const notFound = Object.keys(result.deleted).filter(id => result.deleted[id] === 'not_found');

        console.log(`✅ Deleted: ${deleted.length}, Not found: ${notFound.length}`);

        res.json({
            success: true,
            deleted,
            notFound,
            total: publicIds.length
        });

    } catch (error) {
        console.error('❌ Batch delete error:', error);
        res.status(500).json({ 
            error: 'Batch delete failed', 
            message: error.message 
        });
    }
});

/**
 * GET /api/cloudinary/folders
 * Get all folders
 */
router.get('/folders', async (req, res) => {
    try {
        console.log('📁 Getting all folders');

        const result = await cloudinary.api.root_folders();

        console.log(`✅ Found ${result.folders.length} folders`);

        res.json({
            success: true,
            folders: result.folders
        });

    } catch (error) {
        console.error('❌ Folders fetch error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch folders', 
            message: error.message 
        });
    }
});

/**
 * POST /api/cloudinary/create-folder
 * Create new folder
 */
router.post('/create-folder', async (req, res) => {
    try {
        const { folderName } = req.body;

        if (!folderName) {
            return res.status(400).json({ error: 'Folder name is required' });
        }

        console.log('📁 Creating folder:', folderName);

        const result = await cloudinary.api.create_folder(folderName);

        console.log('✅ Folder created successfully');

        res.json({
            success: true,
            folder: result
        });

    } catch (error) {
        console.error('❌ Folder creation error:', error);
        res.status(500).json({ 
            error: 'Folder creation failed', 
            message: error.message 
        });
    }
});

/**
 * GET /api/cloudinary/usage
 * Get account usage statistics
 */
router.get('/usage', async (req, res) => {
    try {
        console.log('📊 Getting usage statistics');

        const result = await cloudinary.api.usage();

        console.log('✅ Usage statistics retrieved');

        res.json({
            success: true,
            usage: result
        });

    } catch (error) {
        console.error('❌ Usage fetch error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch usage', 
            message: error.message 
        });
    }
});

module.exports = router;
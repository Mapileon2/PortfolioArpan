/**
 * Cloudinary v2 Server Implementation
 * Complete CRUD operations using Cloudinary SDK v2
 */

const express = require('express');
const { v2: cloudinary } = require('cloudinary');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

// Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL || 'https://fzyrsurzgepeawvfjved.supabase.co',
    process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6eXJzdXJ6Z2VwZWF3dmZqdmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NjIyMDYsImV4cCI6MjA3NTIzODIwNn0.cKBp1Sw8l2mY3AxqXiazxe9BFaB3LaZmvzVZvod_42Y'
);

// Configure Cloudinary v2
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dgymjtqil',
    api_key: process.env.CLOUDINARY_API_KEY || '951533987774134',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'jTPgMHSl-6m7LptvsBA5eDbOWwc'
});

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 10
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
        }
    }
});

/**
 * POST /api/cloudinary/upload
 * Upload single image using Cloudinary v2 SDK
 */
router.post('/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: 'No image file provided',
                code: 'NO_FILE'
            });
        }

        const { folder = 'portfolio/general', tags = 'portfolio', transformation } = req.body;

        console.log('🔄 Uploading to Cloudinary v2...');

        // Upload using Cloudinary v2 SDK
        const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: folder,
                    tags: tags.split(','),
                    resource_type: 'auto',
                    transformation: transformation ? JSON.parse(transformation) : [
                        { quality: 'auto:good' },
                        { fetch_format: 'auto' }
                    ],
                    overwrite: false,
                    unique_filename: true
                },
                (error, result) => {
                    if (error) {
                        console.error('❌ Cloudinary upload error:', error);
                        reject(error);
                    } else {
                        console.log('✅ Cloudinary upload successful:', result.public_id);
                        resolve(result);
                    }
                }
            );

            uploadStream.end(req.file.buffer);
        });

        // Save to database
        const imageData = {
            public_id: uploadResult.public_id,
            secure_url: uploadResult.secure_url,
            width: uploadResult.width,
            height: uploadResult.height,
            format: uploadResult.format,
            resource_type: uploadResult.resource_type,
            bytes: uploadResult.bytes,
            folder: uploadResult.folder,
            tags: uploadResult.tags,
            created_at: uploadResult.created_at,
            version: uploadResult.version,
            original_filename: req.file.originalname
        };

        const { data: savedImage, error: dbError } = await supabase
            .from('cloudinary_images')
            .insert([imageData])
            .select()
            .single();

        if (dbError) {
            console.error('❌ Database save error:', dbError);
            // Don't fail the request if DB save fails
        }

        // Generate thumbnail URL
        const thumbnailUrl = cloudinary.url(uploadResult.public_id, {
            width: 300,
            height: 200,
            crop: 'fill',
            quality: 'auto',
            fetch_format: 'auto'
        });

        res.json({
            success: true,
            message: 'Image uploaded successfully',
            data: {
                id: uploadResult.public_id,
                url: uploadResult.secure_url,
                publicId: uploadResult.public_id,
                width: uploadResult.width,
                height: uploadResult.height,
                format: uploadResult.format,
                size: uploadResult.bytes,
                folder: uploadResult.folder,
                tags: uploadResult.tags,
                thumbnail: thumbnailUrl,
                createdAt: uploadResult.created_at,
                version: uploadResult.version,
                originalFilename: req.file.originalname
            }
        });

    } catch (error) {
        console.error('❌ Upload failed:', error);
        res.status(500).json({
            error: 'Upload failed',
            message: error.message,
            code: 'UPLOAD_ERROR'
        });
    }
});

/**
 * POST /api/cloudinary/upload-multiple
 * Upload multiple images
 */
router.post('/upload-multiple', upload.array('images', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                error: 'No image files provided',
                code: 'NO_FILES'
            });
        }

        const { folder = 'portfolio/general', tags = 'portfolio' } = req.body;
        const results = [];
        const errors = [];

        console.log(`🔄 Uploading ${req.files.length} images to Cloudinary v2...`);

        // Upload each file
        for (const file of req.files) {
            try {
                const uploadResult = await new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        {
                            folder: folder,
                            tags: tags.split(','),
                            resource_type: 'auto',
                            transformation: [
                                { quality: 'auto:good' },
                                { fetch_format: 'auto' }
                            ],
                            overwrite: false,
                            unique_filename: true
                        },
                        (error, result) => {
                            if (error) reject(error);
                            else resolve(result);
                        }
                    );

                    uploadStream.end(file.buffer);
                });

                // Save to database
                const imageData = {
                    public_id: uploadResult.public_id,
                    secure_url: uploadResult.secure_url,
                    width: uploadResult.width,
                    height: uploadResult.height,
                    format: uploadResult.format,
                    resource_type: uploadResult.resource_type,
                    bytes: uploadResult.bytes,
                    folder: uploadResult.folder,
                    tags: uploadResult.tags,
                    created_at: uploadResult.created_at,
                    version: uploadResult.version,
                    original_filename: file.originalname
                };

                await supabase.from('cloudinary_images').insert([imageData]);

                const thumbnailUrl = cloudinary.url(uploadResult.public_id, {
                    width: 300,
                    height: 200,
                    crop: 'fill',
                    quality: 'auto'
                });

                results.push({
                    id: uploadResult.public_id,
                    url: uploadResult.secure_url,
                    publicId: uploadResult.public_id,
                    width: uploadResult.width,
                    height: uploadResult.height,
                    format: uploadResult.format,
                    size: uploadResult.bytes,
                    thumbnail: thumbnailUrl,
                    originalFilename: file.originalname
                });

            } catch (error) {
                console.error(`❌ Failed to upload ${file.originalname}:`, error);
                errors.push({
                    filename: file.originalname,
                    error: error.message
                });
            }
        }

        console.log(`✅ Batch upload completed: ${results.length} successful, ${errors.length} failed`);

        res.json({
            success: true,
            message: `Uploaded ${results.length} of ${req.files.length} images`,
            data: {
                successful: results,
                failed: errors,
                summary: {
                    total: req.files.length,
                    successful: results.length,
                    failed: errors.length
                }
            }
        });

    } catch (error) {
        console.error('❌ Batch upload failed:', error);
        res.status(500).json({
            error: 'Batch upload failed',
            message: error.message,
            code: 'BATCH_UPLOAD_ERROR'
        });
    }
});

/**
 * DELETE /api/cloudinary/delete
 * Delete image from Cloudinary
 */
router.delete('/delete', async (req, res) => {
    try {
        const { publicId } = req.body;

        if (!publicId) {
            return res.status(400).json({
                error: 'Public ID is required',
                code: 'NO_PUBLIC_ID'
            });
        }

        console.log(`🗑️ Deleting image: ${publicId}`);

        // Delete from Cloudinary using v2 SDK
        const deleteResult = await cloudinary.uploader.destroy(publicId);

        if (deleteResult.result !== 'ok') {
            throw new Error(`Cloudinary deletion failed: ${deleteResult.result}`);
        }

        // Delete from database
        const { error: dbError } = await supabase
            .from('cloudinary_images')
            .delete()
            .eq('public_id', publicId);

        if (dbError) {
            console.error('❌ Database deletion error:', dbError);
            // Don't fail the request if DB deletion fails
        }

        console.log('✅ Image deleted successfully');

        res.json({
            success: true,
            message: 'Image deleted successfully',
            data: {
                publicId: publicId,
                result: deleteResult.result
            }
        });

    } catch (error) {
        console.error('❌ Delete failed:', error);
        res.status(500).json({
            error: 'Delete failed',
            message: error.message,
            code: 'DELETE_ERROR'
        });
    }
});

/**
 * GET /api/cloudinary/images
 * Get all uploaded images
 */
router.get('/images', async (req, res) => {
    try {
        const { folder, tags, limit = 50, offset = 0 } = req.query;

        console.log('📋 Fetching images from database...');

        let query = supabase
            .from('cloudinary_images')
            .select('*')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (folder) {
            query = query.eq('folder', folder);
        }

        if (tags) {
            query = query.contains('tags', [tags]);
        }

        const { data: images, error } = await query;

        if (error) {
            throw error;
        }

        // Generate thumbnail URLs
        const imagesWithThumbnails = images.map(image => ({
            ...image,
            thumbnail: cloudinary.url(image.public_id, {
                width: 300,
                height: 200,
                crop: 'fill',
                quality: 'auto'
            })
        }));

        res.json({
            success: true,
            data: imagesWithThumbnails,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total: images.length
            }
        });

    } catch (error) {
        console.error('❌ Failed to fetch images:', error);
        res.status(500).json({
            error: 'Failed to fetch images',
            message: error.message,
            code: 'FETCH_ERROR'
        });
    }
});

/**
 * POST /api/cloudinary/transform
 * Generate transformed image URL
 */
router.post('/transform', async (req, res) => {
    try {
        const { publicId, transformations } = req.body;

        if (!publicId) {
            return res.status(400).json({
                error: 'Public ID is required',
                code: 'NO_PUBLIC_ID'
            });
        }

        // Generate transformed URL using Cloudinary v2
        const transformedUrl = cloudinary.url(publicId, transformations);

        res.json({
            success: true,
            data: {
                publicId: publicId,
                originalUrl: cloudinary.url(publicId),
                transformedUrl: transformedUrl,
                transformations: transformations
            }
        });

    } catch (error) {
        console.error('❌ Transform failed:', error);
        res.status(500).json({
            error: 'Transform failed',
            message: error.message,
            code: 'TRANSFORM_ERROR'
        });
    }
});

/**
 * POST /api/cloudinary/upload-text
 * Upload text as image using Cloudinary v2
 */
router.post('/upload-text', async (req, res) => {
    try {
        const { text, options = {} } = req.body;

        if (!text) {
            return res.status(400).json({
                error: 'Text is required',
                code: 'NO_TEXT'
            });
        }

        console.log('🔄 Uploading text as image...');

        // Upload text using Cloudinary v2 SDK
        const result = await cloudinary.uploader.text(text, {
            font_family: options.fontFamily || 'Arial',
            font_size: options.fontSize || 72,
            color: options.color || '#000000',
            background: options.background || 'transparent',
            folder: options.folder || 'portfolio/text',
            tags: ['text', 'generated'].concat(options.tags || [])
        });

        console.log('✅ Text upload successful:', result.public_id);

        // Save to database
        const imageData = {
            public_id: result.public_id,
            secure_url: result.secure_url,
            width: result.width,
            height: result.height,
            format: result.format,
            resource_type: result.resource_type,
            bytes: result.bytes,
            folder: result.folder,
            tags: result.tags,
            created_at: result.created_at,
            version: result.version,
            original_filename: `text_${Date.now()}.png`
        };

        await supabase.from('cloudinary_images').insert([imageData]);

        res.json({
            success: true,
            message: 'Text uploaded as image successfully',
            data: {
                id: result.public_id,
                url: result.secure_url,
                publicId: result.public_id,
                width: result.width,
                height: result.height,
                format: result.format,
                size: result.bytes,
                text: text,
                options: options
            }
        });

    } catch (error) {
        console.error('❌ Text upload failed:', error);
        res.status(500).json({
            error: 'Text upload failed',
            message: error.message,
            code: 'TEXT_UPLOAD_ERROR'
        });
    }
});

/**
 * GET /api/cloudinary/folders
 * Get all folders
 */
router.get('/folders', async (req, res) => {
    try {
        console.log('📁 Fetching folders...');

        const result = await cloudinary.api.root_folders();

        res.json({
            success: true,
            data: result.folders
        });

    } catch (error) {
        console.error('❌ Failed to fetch folders:', error);
        res.status(500).json({
            error: 'Failed to fetch folders',
            message: error.message,
            code: 'FOLDERS_ERROR'
        });
    }
});

module.exports = router;
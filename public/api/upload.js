/**
 * File Upload API - Enterprise SaaS Implementation
 * Senior Software Engineer Level with Cloudinary Integration
 */

const express = require('express');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const sharp = require('sharp');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dgymjtqil',
    api_key: process.env.CLOUDINARY_API_KEY || '951533987774134',
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Rate limiting for uploads
const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // limit each IP to 20 uploads per windowMs
    message: {
        error: 'Too many upload attempts, please try again later.',
        code: 'UPLOAD_RATE_LIMIT_EXCEEDED'
    }
});

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 5 // Maximum 5 files per request
    },
    fileFilter: (req, file, cb) => {
        // Check file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'];
        
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, WebP, GIF images and MP4, WebM videos are allowed.'));
        }
    }
});

// Authentication middleware
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                error: 'Access token required',
                code: 'TOKEN_MISSING'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', decoded.sub)
            .single();

        if (error || !user) {
            return res.status(401).json({
                error: 'Invalid token',
                code: 'TOKEN_INVALID'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(401).json({
            error: 'Token verification failed',
            code: 'TOKEN_VERIFICATION_FAILED'
        });
    }
};

// Check user storage quota
const checkStorageQuota = async (req, res, next) => {
    try {
        const { data: usage } = await supabase
            .from('user_storage_usage')
            .select('total_size_mb')
            .eq('user_id', req.user.id)
            .single();

        const currentUsage = usage?.total_size_mb || 0;
        const quotaLimits = {
            free: 100, // 100MB
            pro: 1000, // 1GB
            enterprise: 10000 // 10GB
        };

        const userQuota = quotaLimits[req.user.subscription_tier] || quotaLimits.free;

        if (currentUsage >= userQuota) {
            return res.status(413).json({
                error: 'Storage quota exceeded',
                code: 'QUOTA_EXCEEDED',
                details: {
                    current: currentUsage,
                    limit: userQuota,
                    tier: req.user.subscription_tier
                }
            });
        }

        req.storageQuota = {
            current: currentUsage,
            limit: userQuota,
            available: userQuota - currentUsage
        };

        next();
    } catch (error) {
        console.error('Storage quota check error:', error);
        next(); // Continue even if quota check fails
    }
};

// Image optimization function
const optimizeImage = async (buffer, options = {}) => {
    try {
        const {
            width = 1920,
            height = 1080,
            quality = 85,
            format = 'webp'
        } = options;

        return await sharp(buffer)
            .resize(width, height, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .toFormat(format, { quality })
            .toBuffer();
    } catch (error) {
        console.error('Image optimization error:', error);
        return buffer; // Return original if optimization fails
    }
};

// Generate unique filename
const generateFileName = (originalName, userId) => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const extension = originalName.split('.').pop();
    return `${userId}/${timestamp}_${random}.${extension}`;
};

/**
 * POST /api/upload/image
 * Upload single image
 */
router.post('/image',
    uploadLimiter,
    authenticateToken,
    checkStorageQuota,
    upload.single('image'),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    error: 'No image file provided',
                    code: 'NO_FILE'
                });
            }

            const { folder = 'general', optimize = 'true' } = req.body;
            
            // Validate folder name
            const allowedFolders = ['general', 'case-studies', 'hero', 'gallery', 'profile'];
            if (!allowedFolders.includes(folder)) {
                return res.status(400).json({
                    error: 'Invalid folder name',
                    code: 'INVALID_FOLDER'
                });
            }

            let fileBuffer = req.file.buffer;
            let fileSize = req.file.size;

            // Optimize image if requested and it's an image
            if (optimize === 'true' && req.file.mimetype.startsWith('image/')) {
                try {
                    fileBuffer = await optimizeImage(fileBuffer, {
                        width: 1920,
                        height: 1080,
                        quality: 85,
                        format: 'webp'
                    });
                    fileSize = fileBuffer.length;
                } catch (optimizeError) {
                    console.error('Image optimization failed:', optimizeError);
                    // Continue with original file
                }
            }

            // Upload to Cloudinary
            const uploadResult = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: `portfolio/${req.user.id}/${folder}`,
                        public_id: generateFileName(req.file.originalname, req.user.id),
                        resource_type: 'auto',
                        transformation: [
                            { quality: 'auto:good' },
                            { fetch_format: 'auto' }
                        ],
                        tags: [req.user.id, folder, 'portfolio']
                    },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );

                uploadStream.end(fileBuffer);
            });

            // Store file metadata in database
            const fileData = {
                user_id: req.user.id,
                filename: req.file.originalname,
                cloudinary_public_id: uploadResult.public_id,
                cloudinary_url: uploadResult.secure_url,
                file_type: req.file.mimetype,
                file_size: fileSize,
                folder: folder,
                width: uploadResult.width,
                height: uploadResult.height,
                created_at: new Date().toISOString()
            };

            const { data: fileRecord, error: dbError } = await supabase
                .from('uploaded_files')
                .insert([fileData])
                .select()
                .single();

            if (dbError) {
                console.error('Database error:', dbError);
                // Try to delete from Cloudinary if database insert fails
                try {
                    await cloudinary.uploader.destroy(uploadResult.public_id);
                } catch (cleanupError) {
                    console.error('Cleanup error:', cleanupError);
                }
                
                return res.status(500).json({
                    error: 'Failed to save file metadata',
                    code: 'DATABASE_ERROR'
                });
            }

            // Update user storage usage
            await supabase.rpc('update_user_storage_usage', {
                p_user_id: req.user.id,
                p_size_change: Math.round(fileSize / (1024 * 1024) * 100) / 100 // Convert to MB
            });

            // Log activity
            await supabase
                .from('activity_logs')
                .insert([{
                    user_id: req.user.id,
                    action: 'file_uploaded',
                    resource_id: fileRecord.id,
                    resource_type: 'file',
                    metadata: {
                        filename: req.file.originalname,
                        folder: folder,
                        size: fileSize
                    }
                }]);

            res.json({
                message: 'Image uploaded successfully',
                data: {
                    id: fileRecord.id,
                    url: uploadResult.secure_url,
                    publicId: uploadResult.public_id,
                    width: uploadResult.width,
                    height: uploadResult.height,
                    size: fileSize,
                    folder: folder,
                    optimized: optimize === 'true'
                }
            });

        } catch (error) {
            console.error('Image upload error:', error);
            
            if (error.message.includes('Invalid file type')) {
                return res.status(400).json({
                    error: error.message,
                    code: 'INVALID_FILE_TYPE'
                });
            }

            res.status(500).json({
                error: 'Image upload failed',
                code: 'UPLOAD_ERROR'
            });
        }
    }
);

/**
 * POST /api/upload/multiple
 * Upload multiple images
 */
router.post('/multiple',
    uploadLimiter,
    authenticateToken,
    checkStorageQuota,
    upload.array('images', 5),
    async (req, res) => {
        try {
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({
                    error: 'No image files provided',
                    code: 'NO_FILES'
                });
            }

            const { folder = 'general', optimize = 'true' } = req.body;
            
            const allowedFolders = ['general', 'case-studies', 'hero', 'gallery', 'profile'];
            if (!allowedFolders.includes(folder)) {
                return res.status(400).json({
                    error: 'Invalid folder name',
                    code: 'INVALID_FOLDER'
                });
            }

            const uploadPromises = req.files.map(async (file) => {
                try {
                    let fileBuffer = file.buffer;
                    let fileSize = file.size;

                    // Optimize image if requested
                    if (optimize === 'true' && file.mimetype.startsWith('image/')) {
                        try {
                            fileBuffer = await optimizeImage(fileBuffer);
                            fileSize = fileBuffer.length;
                        } catch (optimizeError) {
                            console.error('Image optimization failed:', optimizeError);
                        }
                    }

                    // Upload to Cloudinary
                    const uploadResult = await new Promise((resolve, reject) => {
                        const uploadStream = cloudinary.uploader.upload_stream(
                            {
                                folder: `portfolio/${req.user.id}/${folder}`,
                                public_id: generateFileName(file.originalname, req.user.id),
                                resource_type: 'auto',
                                transformation: [
                                    { quality: 'auto:good' },
                                    { fetch_format: 'auto' }
                                ],
                                tags: [req.user.id, folder, 'portfolio']
                            },
                            (error, result) => {
                                if (error) reject(error);
                                else resolve(result);
                            }
                        );

                        uploadStream.end(fileBuffer);
                    });

                    // Store file metadata
                    const fileData = {
                        user_id: req.user.id,
                        filename: file.originalname,
                        cloudinary_public_id: uploadResult.public_id,
                        cloudinary_url: uploadResult.secure_url,
                        file_type: file.mimetype,
                        file_size: fileSize,
                        folder: folder,
                        width: uploadResult.width,
                        height: uploadResult.height,
                        created_at: new Date().toISOString()
                    };

                    const { data: fileRecord, error: dbError } = await supabase
                        .from('uploaded_files')
                        .insert([fileData])
                        .select()
                        .single();

                    if (dbError) {
                        throw new Error('Database insert failed');
                    }

                    return {
                        success: true,
                        id: fileRecord.id,
                        url: uploadResult.secure_url,
                        publicId: uploadResult.public_id,
                        width: uploadResult.width,
                        height: uploadResult.height,
                        size: fileSize,
                        filename: file.originalname
                    };

                } catch (error) {
                    console.error(`Upload failed for ${file.originalname}:`, error);
                    return {
                        success: false,
                        filename: file.originalname,
                        error: error.message
                    };
                }
            });

            const results = await Promise.all(uploadPromises);
            const successful = results.filter(r => r.success);
            const failed = results.filter(r => !r.success);

            // Update storage usage for successful uploads
            if (successful.length > 0) {
                const totalSize = successful.reduce((sum, file) => sum + file.size, 0);
                await supabase.rpc('update_user_storage_usage', {
                    p_user_id: req.user.id,
                    p_size_change: Math.round(totalSize / (1024 * 1024) * 100) / 100
                });
            }

            // Log activity
            await supabase
                .from('activity_logs')
                .insert([{
                    user_id: req.user.id,
                    action: 'multiple_files_uploaded',
                    resource_type: 'file',
                    metadata: {
                        successful_count: successful.length,
                        failed_count: failed.length,
                        folder: folder
                    }
                }]);

            res.json({
                message: `${successful.length} files uploaded successfully, ${failed.length} failed`,
                data: {
                    successful,
                    failed,
                    summary: {
                        total: req.files.length,
                        successful: successful.length,
                        failed: failed.length
                    }
                }
            });

        } catch (error) {
            console.error('Multiple upload error:', error);
            res.status(500).json({
                error: 'Multiple upload failed',
                code: 'UPLOAD_ERROR'
            });
        }
    }
);

/**
 * DELETE /api/upload/:id
 * Delete uploaded file
 */
router.delete('/:id',
    authenticateToken,
    async (req, res) => {
        try {
            const { id } = req.params;

            // Get file record
            const { data: fileRecord, error: fetchError } = await supabase
                .from('uploaded_files')
                .select('*')
                .eq('id', id)
                .eq('user_id', req.user.id)
                .single();

            if (fetchError || !fileRecord) {
                return res.status(404).json({
                    error: 'File not found',
                    code: 'FILE_NOT_FOUND'
                });
            }

            // Delete from Cloudinary
            try {
                await cloudinary.uploader.destroy(fileRecord.cloudinary_public_id);
            } catch (cloudinaryError) {
                console.error('Cloudinary deletion error:', cloudinaryError);
                // Continue with database deletion even if Cloudinary fails
            }

            // Delete from database
            const { error: deleteError } = await supabase
                .from('uploaded_files')
                .delete()
                .eq('id', id)
                .eq('user_id', req.user.id);

            if (deleteError) {
                console.error('Database deletion error:', deleteError);
                return res.status(500).json({
                    error: 'Failed to delete file record',
                    code: 'DATABASE_ERROR'
                });
            }

            // Update storage usage
            await supabase.rpc('update_user_storage_usage', {
                p_user_id: req.user.id,
                p_size_change: -Math.round(fileRecord.file_size / (1024 * 1024) * 100) / 100
            });

            // Log activity
            await supabase
                .from('activity_logs')
                .insert([{
                    user_id: req.user.id,
                    action: 'file_deleted',
                    resource_id: id,
                    resource_type: 'file',
                    metadata: {
                        filename: fileRecord.filename,
                        folder: fileRecord.folder
                    }
                }]);

            res.json({
                message: 'File deleted successfully'
            });

        } catch (error) {
            console.error('File deletion error:', error);
            res.status(500).json({
                error: 'File deletion failed',
                code: 'DELETE_ERROR'
            });
        }
    }
);

/**
 * GET /api/upload/files
 * Get user's uploaded files
 */
router.get('/files',
    authenticateToken,
    async (req, res) => {
        try {
            const { page = 1, limit = 20, folder, type } = req.query;
            const offset = (page - 1) * limit;

            let query = supabase
                .from('uploaded_files')
                .select('*')
                .eq('user_id', req.user.id)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (folder) {
                query = query.eq('folder', folder);
            }

            if (type) {
                query = query.like('file_type', `${type}%`);
            }

            const { data: files, error } = await query;

            if (error) {
                console.error('Database error:', error);
                return res.status(500).json({
                    error: 'Failed to fetch files',
                    code: 'DATABASE_ERROR'
                });
            }

            // Get total count
            const { count: totalCount } = await supabase
                .from('uploaded_files')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', req.user.id);

            res.json({
                data: files,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: totalCount,
                    pages: Math.ceil(totalCount / limit)
                }
            });

        } catch (error) {
            console.error('Get files error:', error);
            res.status(500).json({
                error: 'Internal server error',
                code: 'INTERNAL_ERROR'
            });
        }
    }
);

/**
 * GET /api/upload/storage-usage
 * Get user's storage usage
 */
router.get('/storage-usage',
    authenticateToken,
    async (req, res) => {
        try {
            const { data: usage } = await supabase
                .from('user_storage_usage')
                .select('*')
                .eq('user_id', req.user.id)
                .single();

            const quotaLimits = {
                free: 100, // 100MB
                pro: 1000, // 1GB
                enterprise: 10000 // 10GB
            };

            const userQuota = quotaLimits[req.user.subscription_tier] || quotaLimits.free;
            const currentUsage = usage?.total_size_mb || 0;

            res.json({
                data: {
                    used: currentUsage,
                    limit: userQuota,
                    available: userQuota - currentUsage,
                    percentage: Math.round((currentUsage / userQuota) * 100),
                    tier: req.user.subscription_tier,
                    file_count: usage?.file_count || 0
                }
            });

        } catch (error) {
            console.error('Storage usage error:', error);
            res.status(500).json({
                error: 'Internal server error',
                code: 'INTERNAL_ERROR'
            });
        }
    }
);

module.exports = router;
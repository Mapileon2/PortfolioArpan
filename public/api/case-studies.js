/**
 * Case Studies API - Enterprise SaaS Implementation
 * Senior Software Engineer Level
 */

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const { body, validationResult, param } = require('express-validator');

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Security middleware
router.use(helmet());
router.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3003'],
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
    }
});
router.use(limiter);

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

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user from Supabase
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

// Input validation schemas
const createCaseStudyValidation = [
    body('project_title')
        .isLength({ min: 3, max: 200 })
        .withMessage('Title must be between 3 and 200 characters')
        .trim()
        .escape(),
    body('project_description')
        .optional()
        .isLength({ max: 2000 })
        .withMessage('Description must not exceed 2000 characters')
        .trim(),
    body('sections')
        .isObject()
        .withMessage('Sections must be a valid object'),
    body('status')
        .optional()
        .isIn(['draft', 'published', 'archived'])
        .withMessage('Status must be draft, published, or archived')
];

const updateCaseStudyValidation = [
    param('id').isUUID().withMessage('Invalid case study ID'),
    ...createCaseStudyValidation
];

// Error handler
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: errors.array()
        });
    }
    next();
};

/**
 * GET /api/case-studies
 * Get all case studies for authenticated user
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 10, status, search } = req.query;
        const offset = (page - 1) * limit;

        let query = supabase
            .from('case_studies')
            .select(`
                id,
                project_title,
                project_description,
                project_image_url,
                status,
                featured,
                created_at,
                updated_at,
                sections
            `)
            .eq('user_id', req.user.id)
            .order('updated_at', { ascending: false })
            .range(offset, offset + limit - 1);

        // Apply filters
        if (status) {
            query = query.eq('status', status);
        }

        if (search) {
            query = query.ilike('project_title', `%${search}%`);
        }

        const { data: caseStudies, error, count } = await query;

        if (error) {
            console.error('Database error:', error);
            return res.status(500).json({
                error: 'Failed to fetch case studies',
                code: 'DATABASE_ERROR'
            });
        }

        // Get total count for pagination
        const { count: totalCount } = await supabase
            .from('case_studies')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', req.user.id);

        res.json({
            data: caseStudies,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalCount,
                pages: Math.ceil(totalCount / limit)
            }
        });

    } catch (error) {
        console.error('Get case studies error:', error);
        res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
});

/**
 * GET /api/case-studies/:id
 * Get specific case study by ID
 */
router.get('/:id', 
    authenticateToken,
    param('id').isUUID().withMessage('Invalid case study ID'),
    handleValidationErrors,
    async (req, res) => {
        try {
            const { id } = req.params;

            const { data: caseStudy, error } = await supabase
                .from('case_studies')
                .select('*')
                .eq('id', id)
                .eq('user_id', req.user.id)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return res.status(404).json({
                        error: 'Case study not found',
                        code: 'NOT_FOUND'
                    });
                }
                console.error('Database error:', error);
                return res.status(500).json({
                    error: 'Failed to fetch case study',
                    code: 'DATABASE_ERROR'
                });
            }

            res.json({ data: caseStudy });

        } catch (error) {
            console.error('Get case study error:', error);
            res.status(500).json({
                error: 'Internal server error',
                code: 'INTERNAL_ERROR'
            });
        }
    }
);

/**
 * POST /api/case-studies
 * Create new case study
 */
router.post('/',
    authenticateToken,
    createCaseStudyValidation,
    handleValidationErrors,
    async (req, res) => {
        try {
            const {
                project_title,
                project_description,
                project_image_url,
                sections,
                status = 'draft',
                featured = false
            } = req.body;

            const caseStudyData = {
                user_id: req.user.id,
                project_title,
                project_description,
                project_image_url,
                sections,
                status,
                featured,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { data: caseStudy, error } = await supabase
                .from('case_studies')
                .insert([caseStudyData])
                .select()
                .single();

            if (error) {
                console.error('Database error:', error);
                return res.status(500).json({
                    error: 'Failed to create case study',
                    code: 'DATABASE_ERROR'
                });
            }

            // Log activity
            await supabase
                .from('activity_logs')
                .insert([{
                    user_id: req.user.id,
                    action: 'case_study_created',
                    resource_id: caseStudy.id,
                    resource_type: 'case_study',
                    metadata: { title: project_title }
                }]);

            res.status(201).json({
                data: caseStudy,
                message: 'Case study created successfully'
            });

        } catch (error) {
            console.error('Create case study error:', error);
            res.status(500).json({
                error: 'Internal server error',
                code: 'INTERNAL_ERROR'
            });
        }
    }
);

/**
 * PUT /api/case-studies/:id
 * Update existing case study
 */
router.put('/:id',
    authenticateToken,
    updateCaseStudyValidation,
    handleValidationErrors,
    async (req, res) => {
        try {
            const { id } = req.params;
            const {
                project_title,
                project_description,
                project_image_url,
                sections,
                status,
                featured
            } = req.body;

            // Check if case study exists and belongs to user
            const { data: existingCaseStudy, error: fetchError } = await supabase
                .from('case_studies')
                .select('id, project_title')
                .eq('id', id)
                .eq('user_id', req.user.id)
                .single();

            if (fetchError) {
                if (fetchError.code === 'PGRST116') {
                    return res.status(404).json({
                        error: 'Case study not found',
                        code: 'NOT_FOUND'
                    });
                }
                console.error('Database error:', fetchError);
                return res.status(500).json({
                    error: 'Failed to fetch case study',
                    code: 'DATABASE_ERROR'
                });
            }

            const updateData = {
                project_title,
                project_description,
                project_image_url,
                sections,
                status,
                featured,
                updated_at: new Date().toISOString()
            };

            const { data: caseStudy, error } = await supabase
                .from('case_studies')
                .update(updateData)
                .eq('id', id)
                .eq('user_id', req.user.id)
                .select()
                .single();

            if (error) {
                console.error('Database error:', error);
                return res.status(500).json({
                    error: 'Failed to update case study',
                    code: 'DATABASE_ERROR'
                });
            }

            // Log activity
            await supabase
                .from('activity_logs')
                .insert([{
                    user_id: req.user.id,
                    action: 'case_study_updated',
                    resource_id: id,
                    resource_type: 'case_study',
                    metadata: { 
                        title: project_title,
                        previous_title: existingCaseStudy.project_title
                    }
                }]);

            res.json({
                data: caseStudy,
                message: 'Case study updated successfully'
            });

        } catch (error) {
            console.error('Update case study error:', error);
            res.status(500).json({
                error: 'Internal server error',
                code: 'INTERNAL_ERROR'
            });
        }
    }
);

/**
 * DELETE /api/case-studies/:id
 * Delete case study
 */
router.delete('/:id',
    authenticateToken,
    param('id').isUUID().withMessage('Invalid case study ID'),
    handleValidationErrors,
    async (req, res) => {
        try {
            const { id } = req.params;

            // Check if case study exists and belongs to user
            const { data: existingCaseStudy, error: fetchError } = await supabase
                .from('case_studies')
                .select('id, project_title')
                .eq('id', id)
                .eq('user_id', req.user.id)
                .single();

            if (fetchError) {
                if (fetchError.code === 'PGRST116') {
                    return res.status(404).json({
                        error: 'Case study not found',
                        code: 'NOT_FOUND'
                    });
                }
                console.error('Database error:', fetchError);
                return res.status(500).json({
                    error: 'Failed to fetch case study',
                    code: 'DATABASE_ERROR'
                });
            }

            const { error } = await supabase
                .from('case_studies')
                .delete()
                .eq('id', id)
                .eq('user_id', req.user.id);

            if (error) {
                console.error('Database error:', error);
                return res.status(500).json({
                    error: 'Failed to delete case study',
                    code: 'DATABASE_ERROR'
                });
            }

            // Log activity
            await supabase
                .from('activity_logs')
                .insert([{
                    user_id: req.user.id,
                    action: 'case_study_deleted',
                    resource_id: id,
                    resource_type: 'case_study',
                    metadata: { title: existingCaseStudy.project_title }
                }]);

            res.json({
                message: 'Case study deleted successfully'
            });

        } catch (error) {
            console.error('Delete case study error:', error);
            res.status(500).json({
                error: 'Internal server error',
                code: 'INTERNAL_ERROR'
            });
        }
    }
);

/**
 * POST /api/case-studies/:id/publish
 * Publish case study
 */
router.post('/:id/publish',
    authenticateToken,
    param('id').isUUID().withMessage('Invalid case study ID'),
    handleValidationErrors,
    async (req, res) => {
        try {
            const { id } = req.params;

            const { data: caseStudy, error } = await supabase
                .from('case_studies')
                .update({
                    status: 'published',
                    published_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .eq('user_id', req.user.id)
                .select()
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return res.status(404).json({
                        error: 'Case study not found',
                        code: 'NOT_FOUND'
                    });
                }
                console.error('Database error:', error);
                return res.status(500).json({
                    error: 'Failed to publish case study',
                    code: 'DATABASE_ERROR'
                });
            }

            // Log activity
            await supabase
                .from('activity_logs')
                .insert([{
                    user_id: req.user.id,
                    action: 'case_study_published',
                    resource_id: id,
                    resource_type: 'case_study',
                    metadata: { title: caseStudy.project_title }
                }]);

            res.json({
                data: caseStudy,
                message: 'Case study published successfully'
            });

        } catch (error) {
            console.error('Publish case study error:', error);
            res.status(500).json({
                error: 'Internal server error',
                code: 'INTERNAL_ERROR'
            });
        }
    }
);

module.exports = router;
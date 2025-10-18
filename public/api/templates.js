/**
 * Template Management API Endpoints
 * Provides RESTful API for content template functionality
 * 
 * Endpoints:
 * GET    /api/templates - Get templates with filtering and pagination
 * POST   /api/templates - Create new template
 * GET    /api/templates/:id - Get specific template
 * PUT    /api/templates/:id - Update template
 * DELETE /api/templates/:id - Delete template
 * 
 * GET    /api/templates/categories - Get template categories
 * POST   /api/templates/categories - Create template category (admin only)
 * 
 * POST   /api/templates/:id/apply - Apply template to case study
 * POST   /api/templates/:id/preview - Preview template with variables
 * 
 * GET    /api/templates/:id/versions - Get template versions
 * POST   /api/templates/:id/versions - Create template version
 * 
 * POST   /api/templates/:id/rate - Rate template
 * GET    /api/templates/:id/ratings - Get template ratings
 * 
 * GET    /api/templates/:id/usage - Get template usage statistics
 * GET    /api/templates/popular - Get popular templates
 * GET    /api/templates/featured - Get featured templates
 * 
 * POST   /api/templates/:id/share - Share template
 * GET    /api/templates/shared - Get shared templates
 * 
 * GET    /api/templates/collections - Get template collections
 * POST   /api/templates/collections - Create template collection
 * GET    /api/templates/collections/:id - Get collection templates
 * POST   /api/templates/collections/:id/add - Add template to collection
 */

const { createClient } = require('@supabase/supabase-js');
const rateLimit = require('express-rate-limit');

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Rate limiting for template operations
const templateRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Limit each IP to 200 requests per windowMs
    message: {
        error: 'Too many template requests',
        message: 'Please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Stricter rate limiting for template creation/updates
const templateMutationRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Limit each IP to 50 mutations per windowMs
    message: {
        error: 'Too many template modifications',
        message: 'Please try again later'
    }
});

// Middleware to verify authentication
const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                message: 'Please provide a valid authentication token'
            });
        }

        const token = authHeader.substring(7);
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid authentication token',
                message: 'Please log in again'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('❌ Authentication error:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication error',
            message: 'Internal server error'
        });
    }
};

// Middleware to check admin permissions
const requireAdmin = async (req, res, next) => {
    try {
        const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', req.user.id)
            .single();

        if (error || !profile || !['admin', 'super_admin'].includes(profile.role)) {
            return res.status(403).json({
                success: false,
                error: 'Admin access required',
                message: 'You do not have permission to perform this action'
            });
        }

        next();
    } catch (error) {
        console.error('❌ Admin check error:', error);
        res.status(500).json({
            success: false,
            error: 'Permission check error',
            message: 'Internal server error'
        });
    }
};

// Helper function to validate template access
const validateTemplateAccess = async (templateId, userId, requireOwnership = false) => {
    const { data: template, error } = await supabase
        .from('content_templates')
        .select('id, created_by, visibility, is_public')
        .eq('id', templateId)
        .eq('is_active', true)
        .single();

    if (error || !template) {
        throw new Error('Template not found');
    }

    // Check if user has access
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', userId)
        .single();

    const isAdmin = profile && ['admin', 'super_admin'].includes(profile.role);
    const isOwner = template.created_by === userId;
    const isPublic = template.is_public || template.visibility === 'public';

    if (requireOwnership && !isOwner && !isAdmin) {
        throw new Error('You can only manage your own templates');
    }

    if (!isOwner && !isAdmin && !isPublic) {
        // Check if template is shared with user
        const { data: share } = await supabase
            .from('template_shares')
            .select('id')
            .eq('template_id', templateId)
            .eq('shared_with', userId)
            .single();

        if (!share) {
            throw new Error('You do not have access to this template');
        }
    }

    return template;
};

module.exports = (app) => {
    // Apply rate limiting to all template endpoints
    app.use('/api/templates', templateRateLimit);

    /**
     * GET /api/templates/categories
     * Get all template categories
     */
    app.get('/api/templates/categories', requireAuth, async (req, res) => {
        try {
            const { includeStats = 'false' } = req.query;

            console.log('📋 Fetching template categories');

            let query = supabase
                .from('template_categories')
                .select('*')
                .eq('is_active', true)
                .order('sort_order', { ascending: true });

            const { data: categories, error } = await query;

            if (error) {
                throw error;
            }

            // Add template counts if requested
            if (includeStats === 'true' && categories) {
                for (const category of categories) {
                    const { count } = await supabase
                        .from('content_templates')
                        .select('*', { count: 'exact', head: true })
                        .eq('category_id', category.id)
                        .eq('is_active', true);
                    
                    category.template_count = count || 0;
                }
            }

            res.json({
                success: true,
                categories: categories || [],
                message: `Retrieved ${categories?.length || 0} categories`
            });

        } catch (error) {
            console.error('❌ Error fetching categories:', error);
            res.status(400).json({
                success: false,
                error: error.message,
                message: 'Failed to fetch categories'
            });
        }
    });

    /**
     * POST /api/templates/categories
     * Create new template category (admin only)
     */
    app.post('/api/templates/categories', requireAuth, requireAdmin, templateMutationRateLimit, async (req, res) => {
        try {
            const { name, description, icon, color, sortOrder = 0 } = req.body;

            if (!name) {
                return res.status(400).json({
                    success: false,
                    error: 'Category name is required',
                    message: 'Please provide a category name'
                });
            }

            console.log(`📋 Creating template category: ${name}`);

            const { data: newCategory, error } = await supabase
                .from('template_categories')
                .insert({
                    name: name.trim(),
                    description: description?.trim(),
                    icon: icon,
                    color: color,
                    sort_order: sortOrder,
                    created_by: req.user.id
                })
                .select()
                .single();

            if (error) {
                throw error;
            }

            res.status(201).json({
                success: true,
                category: newCategory,
                message: 'Category created successfully'
            });

        } catch (error) {
            console.error('❌ Error creating category:', error);
            res.status(400).json({
                success: false,
                error: error.message,
                message: 'Failed to create category'
            });
        }
    });

    /**
     * GET /api/templates
     * Get templates with filtering and pagination
     */
    app.get('/api/templates', requireAuth, async (req, res) => {
        try {
            const {
                categoryId,
                templateType,
                visibility,
                isPublic,
                isFeatured,
                tags,
                search,
                sortBy = 'created_at',
                sortOrder = 'desc',
                limit = 20,
                offset = 0,
                includeUsage = 'false',
                includeRatings = 'false'
            } = req.query;

            console.log('📋 Fetching templates with filters:', req.query);

            // Build base query using the template_summary view
            let query = supabase
                .from('template_summary')
                .select('*');

            // Apply filters
            if (categoryId) {
                query = query.eq('category_id', categoryId);
            }
            
            if (templateType) {
                query = query.eq('template_type', templateType);
            }
            
            if (visibility) {
                query = query.eq('visibility', visibility);
            }
            
            if (isPublic !== undefined) {
                query = query.eq('is_public', isPublic === 'true');
            }
            
            if (isFeatured !== undefined) {
                query = query.eq('is_featured', isFeatured === 'true');
            }

            // Tag filtering
            if (tags) {
                const tagArray = Array.isArray(tags) ? tags : tags.split(',');
                query = query.overlaps('tags', tagArray);
            }

            // Search functionality
            if (search) {
                query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
            }

            // Apply sorting
            const validSortFields = ['created_at', 'updated_at', 'name', 'usage_count', 'rating_average'];
            const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
            const order = sortOrder === 'asc' ? { ascending: true } : { ascending: false };
            
            query = query.order(sortField, order);

            // Apply pagination
            const limitNum = Math.min(parseInt(limit) || 20, 100); // Max 100 per request
            const offsetNum = parseInt(offset) || 0;
            query = query.range(offsetNum, offsetNum + limitNum - 1);

            const { data: templates, error } = await query;

            if (error) {
                throw error;
            }

            // Get total count for pagination
            let countQuery = supabase
                .from('content_templates')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true);

            // Apply same filters for count
            if (categoryId) countQuery = countQuery.eq('category_id', categoryId);
            if (templateType) countQuery = countQuery.eq('template_type', templateType);
            if (visibility) countQuery = countQuery.eq('visibility', visibility);
            if (isPublic !== undefined) countQuery = countQuery.eq('is_public', isPublic === 'true');
            if (isFeatured !== undefined) countQuery = countQuery.eq('is_featured', isFeatured === 'true');
            if (tags) {
                const tagArray = Array.isArray(tags) ? tags : tags.split(',');
                countQuery = countQuery.overlaps('tags', tagArray);
            }

            const { count: totalCount, error: countError } = await countQuery;

            if (countError) {
                console.warn('⚠️ Could not get total count:', countError);
            }

            res.json({
                success: true,
                templates: templates || [],
                pagination: {
                    total: totalCount || 0,
                    limit: limitNum,
                    offset: offsetNum,
                    hasMore: (offsetNum + limitNum) < (totalCount || 0)
                },
                message: `Retrieved ${templates?.length || 0} templates`
            });

        } catch (error) {
            console.error('❌ Error fetching templates:', error);
            res.status(400).json({
                success: false,
                error: error.message,
                message: 'Failed to fetch templates'
            });
        }
    });

    /**
     * POST /api/templates
     * Create new template
     */
    app.post('/api/templates', requireAuth, templateMutationRateLimit, async (req, res) => {
        try {
            const {
                name,
                description,
                categoryId,
                templateData,
                templateType = 'case_study',
                variables = [],
                tags = [],
                visibility = 'private',
                isPublic = false,
                isFeatured = false,
                previewImageUrl,
                thumbnailUrl
            } = req.body;

            console.log(`📋 Creating template: ${name}`);

            // Validate required fields
            if (!name || !templateData) {
                return res.status(400).json({
                    success: false,
                    error: 'Template name and content are required',
                    message: 'Please provide template name and content'
                });
            }

            // Validate template content structure
            if (!templateData || typeof templateData !== 'object') {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid template content',
                    message: 'Template content must be a valid object'
                });
            }

            // Extract variables from template content if not provided
            const extractedVariables = variables.length > 0 ? variables : extractVariablesFromContent(templateData);

            // Create template
            const { data: newTemplate, error } = await supabase
                .from('content_templates')
                .insert({
                    name: name.trim(),
                    description: description?.trim(),
                    category_id: categoryId,
                    template_data: templateData,
                    template_type: templateType,
                    variables: extractedVariables,
                    tags: tags,
                    visibility: visibility,
                    is_public: isPublic,
                    is_featured: isFeatured,
                    preview_image_url: previewImageUrl,
                    thumbnail_url: thumbnailUrl,
                    created_by: req.user.id,
                    updated_by: req.user.id
                })
                .select(`
                    *,
                    template_categories!category_id(name, icon, color),
                    user_profiles!created_by(full_name, avatar_url)
                `)
                .single();

            if (error) {
                throw error;
            }

            // Create initial version
            await supabase
                .from('template_versions')
                .insert({
                    template_id: newTemplate.id,
                    version_number: 1,
                    template_data: templateData,
                    variables: extractedVariables,
                    version_name: 'Initial Version',
                    change_summary: 'Template created',
                    is_current: true,
                    created_by: req.user.id
                });

            res.status(201).json({
                success: true,
                template: newTemplate,
                message: 'Template created successfully'
            });

        } catch (error) {
            console.error('❌ Error creating template:', error);
            res.status(400).json({
                success: false,
                error: error.message,
                message: 'Failed to create template'
            });
        }
    });

    /**
     * GET /api/templates/:id
     * Get specific template
     */
    app.get('/api/templates/:id', requireAuth, async (req, res) => {
        try {
            const { id } = req.params;
            const { includeVersions = 'false', includeUsage = 'false', includeRatings = 'false' } = req.query;

            console.log(`📋 Fetching template: ${id}`);

            // Validate access
            await validateTemplateAccess(id, req.user.id);

            // Get template from summary view
            const { data: template, error } = await supabase
                .from('template_summary')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                throw error;
            }

            if (!template) {
                return res.status(404).json({
                    success: false,
                    error: 'Template not found',
                    message: 'The specified template could not be found'
                });
            }

            // Get full template data
            const { data: fullTemplate, error: fullError } = await supabase
                .from('content_templates')
                .select('*')
                .eq('id', id)
                .single();

            if (fullError) {
                throw fullError;
            }

            // Merge template data
            const result = { ...template, ...fullTemplate };

            // Add additional data if requested
            if (includeVersions === 'true') {
                const { data: versions } = await supabase
                    .from('template_versions')
                    .select(`
                        *,
                        user_profiles!created_by(full_name, avatar_url)
                    `)
                    .eq('template_id', id)
                    .order('version_number', { ascending: false });
                
                result.versions = versions || [];
            }

            if (includeUsage === 'true') {
                const { data: usageStats } = await supabase
                    .from('template_usage')
                    .select('usage_type, success, application_time_ms, created_at')
                    .eq('template_id', id);

                if (usageStats) {
                    const totalUsage = usageStats.length;
                    const successfulApplications = usageStats.filter(s => s.usage_type === 'applied' && s.success).length;
                    const previews = usageStats.filter(s => s.usage_type === 'previewed').length;
                    
                    result.usage_stats = {
                        total_usage: totalUsage,
                        successful_applications: successfulApplications,
                        previews: previews,
                        success_rate: totalUsage > 0 ? (successfulApplications / totalUsage * 100).toFixed(1) : 0
                    };
                }
            }

            if (includeRatings === 'true') {
                const { data: ratings } = await supabase
                    .from('template_ratings')
                    .select(`
                        *,
                        user_profiles!user_id(full_name, avatar_url)
                    `)
                    .eq('template_id', id)
                    .order('created_at', { ascending: false })
                    .limit(10);
                
                result.recent_ratings = ratings || [];
            }

            res.json({
                success: true,
                template: result,
                message: 'Template retrieved successfully'
            });

        } catch (error) {
            console.error('❌ Error fetching template:', error);
            res.status(400).json({
                success: false,
                error: error.message,
                message: 'Failed to fetch template'
            });
        }
    });

    /**
     * PUT /api/templates/:id
     * Update template
     */
    app.put('/api/templates/:id', requireAuth, templateMutationRateLimit, async (req, res) => {
        try {
            const { id } = req.params;
            const updates = req.body;

            console.log(`📋 Updating template: ${id}`);

            // Validate access (require ownership)
            await validateTemplateAccess(id, req.user.id, true);

            // Validate template content if provided
            if (updates.templateData && typeof updates.templateData !== 'object') {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid template content',
                    message: 'Template content must be a valid object'
                });
            }

            // Prepare update data
            const updateData = {
                updated_by: req.user.id,
                updated_at: new Date().toISOString()
            };

            // Map update fields
            if (updates.name) updateData.name = updates.name.trim();
            if (updates.description !== undefined) updateData.description = updates.description?.trim();
            if (updates.categoryId) updateData.category_id = updates.categoryId;
            if (updates.templateData) updateData.template_data = updates.templateData;
            if (updates.templateType) updateData.template_type = updates.templateType;
            if (updates.variables) updateData.variables = updates.variables;
            if (updates.tags) updateData.tags = updates.tags;
            if (updates.visibility) updateData.visibility = updates.visibility;
            if (updates.isPublic !== undefined) updateData.is_public = updates.isPublic;
            if (updates.isFeatured !== undefined) updateData.is_featured = updates.isFeatured;
            if (updates.previewImageUrl !== undefined) updateData.preview_image_url = updates.previewImageUrl;
            if (updates.thumbnailUrl !== undefined) updateData.thumbnail_url = updates.thumbnailUrl;

            // Extract variables if template data changed
            if (updates.templateData && !updates.variables) {
                updateData.variables = extractVariablesFromContent(updates.templateData);
            }

            // Update template
            const { data: updatedTemplate, error } = await supabase
                .from('content_templates')
                .update(updateData)
                .eq('id', id)
                .select(`
                    *,
                    template_categories!category_id(name, icon, color),
                    user_profiles!created_by(full_name, avatar_url)
                `)
                .single();

            if (error) {
                throw error;
            }

            // Create new version if content changed
            if (updates.templateData) {
                // Get next version number
                const { data: lastVersion } = await supabase
                    .from('template_versions')
                    .select('version_number')
                    .eq('template_id', id)
                    .order('version_number', { ascending: false })
                    .limit(1)
                    .single();

                const nextVersionNumber = lastVersion ? lastVersion.version_number + 1 : 1;

                // Mark previous version as not current
                if (nextVersionNumber > 1) {
                    await supabase
                        .from('template_versions')
                        .update({ is_current: false })
                        .eq('template_id', id)
                        .eq('is_current', true);
                }

                // Create new version
                await supabase
                    .from('template_versions')
                    .insert({
                        template_id: id,
                        version_number: nextVersionNumber,
                        template_data: updates.templateData,
                        variables: updateData.variables,
                        change_summary: updates.changeSummary || 'Template updated',
                        is_current: true,
                        created_by: req.user.id
                    });
            }

            res.json({
                success: true,
                template: updatedTemplate,
                message: 'Template updated successfully'
            });

        } catch (error) {
            console.error('❌ Error updating template:', error);
            res.status(400).json({
                success: false,
                error: error.message,
                message: 'Failed to update template'
            });
        }
    });

    /**
     * DELETE /api/templates/:id
     * Delete template (soft delete)
     */
    app.delete('/api/templates/:id', requireAuth, templateMutationRateLimit, async (req, res) => {
        try {
            const { id } = req.params;

            console.log(`📋 Deleting template: ${id}`);

            // Validate access (require ownership)
            await validateTemplateAccess(id, req.user.id, true);

            // Soft delete by setting is_active to false
            const { error } = await supabase
                .from('content_templates')
                .update({ 
                    is_active: false,
                    updated_at: new Date().toISOString(),
                    updated_by: req.user.id
                })
                .eq('id', id);

            if (error) {
                throw error;
            }

            res.json({
                success: true,
                message: 'Template deleted successfully'
            });

        } catch (error) {
            console.error('❌ Error deleting template:', error);
            res.status(400).json({
                success: false,
                error: error.message,
                message: 'Failed to delete template'
            });
        }
    });

    /**
     * POST /api/templates/:id/apply
     * Apply template to case study
     */
    app.post('/api/templates/:id/apply', requireAuth, templateMutationRateLimit, async (req, res) => {
        try {
            const { id } = req.params;
            const {
                caseStudyId,
                variables = {},
                sectionMapping = {},
                preserveExisting = false
            } = req.body;

            console.log(`📋 Applying template ${id} to case study ${caseStudyId}`);

            if (!caseStudyId) {
                return res.status(400).json({
                    success: false,
                    error: 'Case study ID is required',
                    message: 'Please provide a case study ID'
                });
            }

            const startTime = Date.now();

            // Validate template access
            await validateTemplateAccess(id, req.user.id);

            // Get template
            const { data: template, error: templateError } = await supabase
                .from('content_templates')
                .select('*')
                .eq('id', id)
                .eq('is_active', true)
                .single();

            if (templateError || !template) {
                return res.status(404).json({
                    success: false,
                    error: 'Template not found',
                    message: 'The specified template could not be found'
                });
            }

            // Get current case study
            const { data: caseStudy, error: caseStudyError } = await supabase
                .from('case_studies')
                .select('*')
                .eq('id', caseStudyId)
                .single();

            if (caseStudyError || !caseStudy) {
                return res.status(404).json({
                    success: false,
                    error: 'Case study not found',
                    message: 'The specified case study could not be found'
                });
            }

            // Check if user has access to case study
            if (caseStudy.created_by !== req.user.id) {
                // Check if user is admin
                const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('role')
                    .eq('id', req.user.id)
                    .single();

                if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
                    return res.status(403).json({
                        success: false,
                        error: 'Access denied',
                        message: 'You can only apply templates to your own case studies'
                    });
                }
            }

            // Process template content with variables
            const processedContent = processTemplateContent(template.template_data, variables, {
                preserveExisting,
                existingContent: caseStudy
            });

            // Apply section mapping if provided
            let finalContent = processedContent;
            if (Object.keys(sectionMapping).length > 0) {
                finalContent = applySectionMapping(processedContent, sectionMapping);
            }

            // Update case study
            const { data: updatedCaseStudy, error: updateError } = await supabase
                .from('case_studies')
                .update({
                    project_title: finalContent.project_title || caseStudy.project_title,
                    project_description: finalContent.project_description || caseStudy.project_description,
                    sections: finalContent.sections || caseStudy.sections,
                    metadata: {
                        ...caseStudy.metadata,
                        template_applied: {
                            template_id: id,
                            template_name: template.name,
                            applied_at: new Date().toISOString(),
                            variables_used: variables,
                            section_mapping: sectionMapping
                        }
                    },
                    updated_at: new Date().toISOString()
                })
                .eq('id', caseStudyId)
                .select()
                .single();

            if (updateError) {
                throw new Error('Failed to update case study');
            }

            const applicationTime = Date.now() - startTime;

            // Track usage
            await supabase
                .from('template_usage')
                .insert({
                    template_id: id,
                    case_study_id: caseStudyId,
                    user_id: req.user.id,
                    usage_type: 'applied',
                    variables_used: variables,
                    customizations_made: sectionMapping,
                    application_time_ms: applicationTime,
                    success: true
                });

            res.json({
                success: true,
                caseStudy: updatedCaseStudy,
                applicationTime: applicationTime,
                message: 'Template applied successfully'
            });

        } catch (error) {
            console.error('❌ Error applying template:', error);
            
            // Track failed usage
            try {
                await supabase
                    .from('template_usage')
                    .insert({
                        template_id: req.params.id,
                        case_study_id: req.body.caseStudyId,
                        user_id: req.user.id,
                        usage_type: 'applied',
                        success: false,
                        error_message: error.message
                    });
            } catch (trackError) {
                console.warn('⚠️ Could not track failed usage:', trackError);
            }

            res.status(400).json({
                success: false,
                error: error.message,
                message: 'Failed to apply template'
            });
        }
    });

    /**
     * POST /api/templates/:id/preview
     * Preview template with variables
     */
    app.post('/api/templates/:id/preview', requireAuth, async (req, res) => {
        try {
            const { id } = req.params;
            const { variables = {} } = req.body;

            console.log(`📋 Previewing template: ${id}`);

            // Validate template access
            await validateTemplateAccess(id, req.user.id);

            // Get template
            const { data: template, error } = await supabase
                .from('content_templates')
                .select('*')
                .eq('id', id)
                .eq('is_active', true)
                .single();

            if (error || !template) {
                return res.status(404).json({
                    success: false,
                    error: 'Template not found',
                    message: 'The specified template could not be found'
                });
            }

            // Process template content with variables
            const processedContent = processTemplateContent(template.template_data, variables);

            // Track preview usage
            await supabase
                .from('template_usage')
                .insert({
                    template_id: id,
                    user_id: req.user.id,
                    usage_type: 'previewed',
                    variables_used: variables
                });

            res.json({
                success: true,
                preview: processedContent,
                template: {
                    id: template.id,
                    name: template.name,
                    description: template.description,
                    variables: template.variables
                },
                message: 'Template preview generated successfully'
            });

        } catch (error) {
            console.error('❌ Error previewing template:', error);
            res.status(400).json({
                success: false,
                error: error.message,
                message: 'Failed to generate template preview'
            });
        }
    });

    /**
     * POST /api/templates/:id/rate
     * Rate template
     */
    app.post('/api/templates/:id/rate', requireAuth, async (req, res) => {
        try {
            const { id } = req.params;
            const { rating, review } = req.body;

            // Validate rating
            if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid rating',
                    message: 'Rating must be an integer between 1 and 5'
                });
            }

            console.log(`📋 Rating template ${id}: ${rating} stars`);

            // Validate template access
            await validateTemplateAccess(id, req.user.id);

            // Upsert rating
            const { data: newRating, error } = await supabase
                .from('template_ratings')
                .upsert({
                    template_id: id,
                    user_id: req.user.id,
                    rating: rating,
                    review: review
                }, {
                    onConflict: 'template_id,user_id'
                })
                .select(`
                    *,
                    user_profiles!user_id(full_name, avatar_url)
                `)
                .single();

            if (error) {
                throw error;
            }

            res.json({
                success: true,
                rating: newRating,
                message: 'Rating submitted successfully'
            });

        } catch (error) {
            console.error('❌ Error rating template:', error);
            res.status(400).json({
                success: false,
                error: error.message,
                message: 'Failed to submit rating'
            });
        }
    });

    /**
     * GET /api/templates/:id/ratings
     * Get template ratings
     */
    app.get('/api/templates/:id/ratings', requireAuth, async (req, res) => {
        try {
            const { id } = req.params;
            const { limit = 20, offset = 0 } = req.query;

            console.log(`📋 Fetching ratings for template: ${id}`);

            // Validate template access
            await validateTemplateAccess(id, req.user.id);

            const { data: ratings, error } = await supabase
                .from('template_ratings')
                .select(`
                    *,
                    user_profiles!user_id(full_name, avatar_url)
                `)
                .eq('template_id', id)
                .order('created_at', { ascending: false })
                .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

            if (error) {
                throw error;
            }

            res.json({
                success: true,
                ratings: ratings || [],
                message: `Retrieved ${ratings?.length || 0} ratings`
            });

        } catch (error) {
            console.error('❌ Error fetching ratings:', error);
            res.status(400).json({
                success: false,
                error: error.message,
                message: 'Failed to fetch ratings'
            });
        }
    });

    /**
     * GET /api/templates/popular
     * Get popular templates
     */
    app.get('/api/templates/popular', requireAuth, async (req, res) => {
        try {
            const { limit = 10 } = req.query;

            console.log('📋 Fetching popular templates');

            const { data: templates, error } = await supabase
                .from('popular_templates')
                .select('*')
                .limit(parseInt(limit));

            if (error) {
                throw error;
            }

            res.json({
                success: true,
                templates: templates || [],
                message: `Retrieved ${templates?.length || 0} popular templates`
            });

        } catch (error) {
            console.error('❌ Error fetching popular templates:', error);
            res.status(400).json({
                success: false,
                error: error.message,
                message: 'Failed to fetch popular templates'
            });
        }
    });

    /**
     * GET /api/templates/featured
     * Get featured templates
     */
    app.get('/api/templates/featured', requireAuth, async (req, res) => {
        try {
            const { limit = 10 } = req.query;

            console.log('📋 Fetching featured templates');

            const { data: templates, error } = await supabase
                .from('template_summary')
                .select('*')
                .eq('is_featured', true)
                .order('usage_count', { ascending: false })
                .limit(parseInt(limit));

            if (error) {
                throw error;
            }

            res.json({
                success: true,
                templates: templates || [],
                message: `Retrieved ${templates?.length || 0} featured templates`
            });

        } catch (error) {
            console.error('❌ Error fetching featured templates:', error);
            res.status(400).json({
                success: false,
                error: error.message,
                message: 'Failed to fetch featured templates'
            });
        }
    });

    console.log('📋 Template Management API endpoints registered');
};

// Helper functions
function extractVariablesFromContent(content) {
    const variables = new Set();
    const variablePattern = /\{\{([^}]+)\}\}/g;
    
    const extractFromValue = (value) => {
        if (typeof value === 'string') {
            const matches = value.match(variablePattern);
            if (matches) {
                matches.forEach(match => {
                    const variableName = match.replace(/[{}]/g, '').trim();
                    variables.add(variableName);
                });
            }
        } else if (Array.isArray(value)) {
            value.forEach(extractFromValue);
        } else if (value && typeof value === 'object') {
            Object.values(value).forEach(extractFromValue);
        }
    };

    extractFromValue(content);

    // Convert to variable definition objects
    return Array.from(variables).map(name => ({
        name: name,
        type: 'text',
        label: generateVariableLabel(name),
        description: `Variable: ${name}`,
        required: true,
        defaultValue: ''
    }));
}

function generateVariableLabel(variableName) {
    return variableName
        .split(/[._-]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function processTemplateContent(templateData, variables = {}, options = {}) {
    const { preserveExisting = false, existingContent = null } = options;
    const variablePattern = /\{\{([^}]+)\}\}/g;

    // Deep clone template data to avoid mutations
    let processedData = JSON.parse(JSON.stringify(templateData));

    // Process string replacement recursively
    const processValue = (value) => {
        if (typeof value === 'string') {
            return value.replace(variablePattern, (match, variableName) => {
                const trimmedName = variableName.trim();
                const variableValue = getNestedValue(variables, trimmedName);
                return variableValue !== undefined ? String(variableValue) : match;
            });
        } else if (Array.isArray(value)) {
            return value.map(processValue);
        } else if (value && typeof value === 'object') {
            const processed = {};
            for (const [key, val] of Object.entries(value)) {
                processed[key] = processValue(val);
            }
            return processed;
        }
        return value;
    };

    processedData = processValue(processedData);

    // Merge with existing content if preserving
    if (preserveExisting && existingContent) {
        processedData = mergeContent(existingContent, processedData);
    }

    return processedData;
}

function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
}

function mergeContent(existingContent, templateContent) {
    const merged = { ...existingContent };

    // Merge sections
    if (templateContent.sections && existingContent.sections) {
        merged.sections = { ...existingContent.sections, ...templateContent.sections };
    } else if (templateContent.sections) {
        merged.sections = templateContent.sections;
    }

    // Only update title and description if they don't exist
    if (!merged.project_title && templateContent.project_title) {
        merged.project_title = templateContent.project_title;
    }
    
    if (!merged.project_description && templateContent.project_description) {
        merged.project_description = templateContent.project_description;
    }

    return merged;
}

function applySectionMapping(content, sectionMapping) {
    const mapped = { ...content };

    if (mapped.sections && Object.keys(sectionMapping).length > 0) {
        const newSections = {};
        
        for (const [templateSection, targetSection] of Object.entries(sectionMapping)) {
            if (mapped.sections[templateSection]) {
                newSections[targetSection] = mapped.sections[templateSection];
            }
        }
        
        mapped.sections = { ...mapped.sections, ...newSections };
    }

    return mapped;
}
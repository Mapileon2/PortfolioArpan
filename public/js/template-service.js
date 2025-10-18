/**
 * Template Service for CMS Enhancement
 * Provides comprehensive template management functionality
 * 
 * Features:
 * - Template creation, validation, and management
 * - Variable replacement and dynamic content
 * - Template application with customization tracking
 * - Template versioning and history
 * - Template sharing and permissions
 * - Template collections and organization
 * - Usage analytics and performance tracking
 */

class TemplateService {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.templatesTable = 'content_templates';
        this.categoriesTable = 'template_categories';
        this.usageTable = 'template_usage';
        this.ratingsTable = 'template_ratings';
        this.versionsTable = 'template_versions';
        this.sharesTable = 'template_shares';
        this.collectionsTable = 'template_collections';
        this.collectionItemsTable = 'template_collection_items';
        
        // Template variable patterns
        this.variablePattern = /\{\{([^}]+)\}\}/g;
        this.conditionalPattern = /\{\{#if\s+([^}]+)\}\}(.*?)\{\{\/if\}\}/gs;
        this.loopPattern = /\{\{#each\s+([^}]+)\}\}(.*?)\{\{\/each\}\}/gs;
        
        console.log('📋 TemplateService initialized');
    }

    /**
     * Get all template categories
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Categories list
     */
    async getCategories(options = {}) {
        try {
            const { includeStats = false } = options;
            
            let query = this.supabase
                .from(this.categoriesTable)
                .select('*')
                .eq('is_active', true)
                .order('sort_order', { ascending: true });

            const { data: categories, error } = await query;

            if (error) {
                console.error('❌ Error fetching categories:', error);
                throw error;
            }

            // Add template counts if requested
            if (includeStats && categories) {
                for (const category of categories) {
                    const { count } = await this.supabase
                        .from(this.templatesTable)
                        .select('*', { count: 'exact', head: true })
                        .eq('category_id', category.id)
                        .eq('is_active', true);
                    
                    category.template_count = count || 0;
                }
            }

            console.log(`✅ Retrieved ${categories?.length || 0} categories`);
            return {
                success: true,
                categories: categories || [],
                message: `Retrieved ${categories?.length || 0} categories`
            };

        } catch (error) {
            console.error('❌ Error in getCategories:', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to fetch categories'
            };
        }
    }

    /**
     * Get templates with filtering and pagination
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Templates list with pagination
     */
    async getTemplates(options = {}) {
        try {
            const {
                categoryId = null,
                templateType = null,
                visibility = null,
                isPublic = null,
                isFeatured = null,
                tags = [],
                search = null,
                sortBy = 'created_at',
                sortOrder = 'desc',
                limit = 20,
                offset = 0,
                includeUsage = false,
                includeRatings = false
            } = options;

            console.log(`📋 Fetching templates with options:`, options);

            // Build base query
            let query = this.supabase
                .from('template_summary') // Use the view for better performance
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
            
            if (isPublic !== null) {
                query = query.eq('is_public', isPublic);
            }
            
            if (isFeatured !== null) {
                query = query.eq('is_featured', isFeatured);
            }

            // Tag filtering
            if (tags.length > 0) {
                query = query.overlaps('tags', tags);
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
            query = query.range(offset, offset + limit - 1);

            const { data: templates, error } = await query;

            if (error) {
                console.error('❌ Error fetching templates:', error);
                throw error;
            }

            // Get total count for pagination
            let countQuery = this.supabase
                .from(this.templatesTable)
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true);

            // Apply same filters for count
            if (categoryId) countQuery = countQuery.eq('category_id', categoryId);
            if (templateType) countQuery = countQuery.eq('template_type', templateType);
            if (visibility) countQuery = countQuery.eq('visibility', visibility);
            if (isPublic !== null) countQuery = countQuery.eq('is_public', isPublic);
            if (isFeatured !== null) countQuery = countQuery.eq('is_featured', isFeatured);
            if (tags.length > 0) countQuery = countQuery.overlaps('tags', tags);

            const { count: totalCount, error: countError } = await countQuery;

            if (countError) {
                console.warn('⚠️ Could not get total count:', countError);
            }

            // Add additional data if requested
            if (templates && (includeUsage || includeRatings)) {
                for (const template of templates) {
                    if (includeUsage) {
                        const usageStats = await this.getTemplateUsageStats(template.id);
                        template.usage_stats = usageStats.success ? usageStats.stats : null;
                    }
                    
                    if (includeRatings) {
                        const recentRatings = await this.getTemplateRatings(template.id, { limit: 5 });
                        template.recent_ratings = recentRatings.success ? recentRatings.ratings : [];
                    }
                }
            }

            console.log(`✅ Retrieved ${templates?.length || 0} templates`);
            return {
                success: true,
                templates: templates || [],
                pagination: {
                    total: totalCount || 0,
                    limit,
                    offset,
                    hasMore: (offset + limit) < (totalCount || 0)
                },
                message: `Retrieved ${templates?.length || 0} templates`
            };

        } catch (error) {
            console.error('❌ Error in getTemplates:', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to fetch templates'
            };
        }
    }

    /**
     * Get a specific template by ID
     * @param {string} templateId - Template ID
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Template details
     */
    async getTemplate(templateId, options = {}) {
        try {
            const { includeVersions = false, includeUsage = false, includeRatings = false } = options;

            console.log(`📋 Fetching template: ${templateId}`);

            const { data: template, error } = await this.supabase
                .from('template_summary')
                .select('*')
                .eq('id', templateId)
                .single();

            if (error) {
                console.error('❌ Error fetching template:', error);
                throw error;
            }

            if (!template) {
                throw new Error('Template not found');
            }

            // Get full template data
            const { data: fullTemplate, error: fullError } = await this.supabase
                .from(this.templatesTable)
                .select('*')
                .eq('id', templateId)
                .single();

            if (fullError) {
                console.error('❌ Error fetching full template:', fullError);
                throw fullError;
            }

            // Merge template data
            const result = { ...template, ...fullTemplate };

            // Add additional data if requested
            if (includeVersions) {
                const versions = await this.getTemplateVersions(templateId);
                result.versions = versions.success ? versions.versions : [];
            }

            if (includeUsage) {
                const usageStats = await this.getTemplateUsageStats(templateId);
                result.usage_stats = usageStats.success ? usageStats.stats : null;
            }

            if (includeRatings) {
                const ratings = await this.getTemplateRatings(templateId);
                result.ratings = ratings.success ? ratings.ratings : [];
            }

            console.log(`✅ Retrieved template: ${template.name}`);
            return {
                success: true,
                template: result,
                message: 'Template retrieved successfully'
            };

        } catch (error) {
            console.error('❌ Error in getTemplate:', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to fetch template'
            };
        }
    }

    /**
     * Create a new template
     * @param {Object} templateData - Template data
     * @returns {Promise<Object>} Created template
     */
    async createTemplate(templateData) {
        try {
            const {
                name,
                description,
                categoryId,
                templateData: content,
                templateType = 'case_study',
                variables = [],
                tags = [],
                visibility = 'private',
                isPublic = false,
                isFeatured = false,
                previewImageUrl = null,
                thumbnailUrl = null
            } = templateData;

            console.log(`📋 Creating template: ${name}`);

            // Validate required fields
            if (!name || !content) {
                throw new Error('Template name and content are required');
            }

            // Validate template content structure
            const validationResult = this.validateTemplateContent(content);
            if (!validationResult.isValid) {
                throw new Error(`Invalid template content: ${validationResult.errors.join(', ')}`);
            }

            // Get current user
            const { data: { user }, error: userError } = await this.supabase.auth.getUser();
            if (userError || !user) {
                throw new Error('Authentication required');
            }

            // Extract variables from template content if not provided
            const extractedVariables = variables.length > 0 ? variables : this.extractVariables(content);

            // Create template
            const { data: newTemplate, error } = await this.supabase
                .from(this.templatesTable)
                .insert({
                    name: name.trim(),
                    description: description?.trim(),
                    category_id: categoryId,
                    template_data: content,
                    template_type: templateType,
                    variables: extractedVariables,
                    tags: tags,
                    visibility: visibility,
                    is_public: isPublic,
                    is_featured: isFeatured,
                    preview_image_url: previewImageUrl,
                    thumbnail_url: thumbnailUrl,
                    created_by: user.id,
                    updated_by: user.id
                })
                .select(`
                    *,
                    template_categories!category_id(name, icon, color),
                    user_profiles!created_by(full_name, avatar_url)
                `)
                .single();

            if (error) {
                console.error('❌ Error creating template:', error);
                throw error;
            }

            // Create initial version
            await this.createTemplateVersion(newTemplate.id, {
                templateData: content,
                variables: extractedVariables,
                versionName: 'Initial Version',
                changeSummary: 'Template created'
            });

            console.log(`✅ Template created: ${newTemplate.name}`);
            return {
                success: true,
                template: newTemplate,
                message: 'Template created successfully'
            };

        } catch (error) {
            console.error('❌ Error in createTemplate:', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to create template'
            };
        }
    }

    /**
     * Update an existing template
     * @param {string} templateId - Template ID
     * @param {Object} updates - Template updates
     * @returns {Promise<Object>} Updated template
     */
    async updateTemplate(templateId, updates) {
        try {
            console.log(`📋 Updating template: ${templateId}`);

            // Get current user
            const { data: { user }, error: userError } = await this.supabase.auth.getUser();
            if (userError || !user) {
                throw new Error('Authentication required');
            }

            // Validate template content if provided
            if (updates.templateData) {
                const validationResult = this.validateTemplateContent(updates.templateData);
                if (!validationResult.isValid) {
                    throw new Error(`Invalid template content: ${validationResult.errors.join(', ')}`);
                }
            }

            // Prepare update data
            const updateData = {
                updated_by: user.id,
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
                updateData.variables = this.extractVariables(updates.templateData);
            }

            // Update template
            const { data: updatedTemplate, error } = await this.supabase
                .from(this.templatesTable)
                .update(updateData)
                .eq('id', templateId)
                .select(`
                    *,
                    template_categories!category_id(name, icon, color),
                    user_profiles!created_by(full_name, avatar_url)
                `)
                .single();

            if (error) {
                console.error('❌ Error updating template:', error);
                throw error;
            }

            // Create new version if content changed
            if (updates.templateData) {
                await this.createTemplateVersion(templateId, {
                    templateData: updates.templateData,
                    variables: updateData.variables,
                    changeSummary: updates.changeSummary || 'Template updated'
                });
            }

            console.log(`✅ Template updated: ${updatedTemplate.name}`);
            return {
                success: true,
                template: updatedTemplate,
                message: 'Template updated successfully'
            };

        } catch (error) {
            console.error('❌ Error in updateTemplate:', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to update template'
            };
        }
    }

    /**
     * Apply a template to a case study
     * @param {string} templateId - Template ID
     * @param {string} caseStudyId - Case study ID
     * @param {Object} options - Application options
     * @returns {Promise<Object>} Application result
     */
    async applyTemplate(templateId, caseStudyId, options = {}) {
        try {
            const {
                variables = {},
                sectionMapping = {},
                preserveExisting = false,
                trackUsage = true
            } = options;

            console.log(`📋 Applying template ${templateId} to case study ${caseStudyId}`);

            const startTime = Date.now();

            // Get template
            const templateResult = await this.getTemplate(templateId);
            if (!templateResult.success) {
                throw new Error('Template not found');
            }

            const template = templateResult.template;

            // Get current case study
            const { data: caseStudy, error: caseStudyError } = await this.supabase
                .from('case_studies')
                .select('*')
                .eq('id', caseStudyId)
                .single();

            if (caseStudyError) {
                throw new Error('Case study not found');
            }

            // Process template content with variables
            const processedContent = this.processTemplateContent(
                template.template_data,
                variables,
                { preserveExisting, existingContent: caseStudy }
            );

            // Apply section mapping if provided
            let finalContent = processedContent;
            if (Object.keys(sectionMapping).length > 0) {
                finalContent = this.applySectionMapping(processedContent, sectionMapping);
            }

            // Update case study
            const { data: updatedCaseStudy, error: updateError } = await this.supabase
                .from('case_studies')
                .update({
                    project_title: finalContent.project_title || caseStudy.project_title,
                    project_description: finalContent.project_description || caseStudy.project_description,
                    sections: finalContent.sections || caseStudy.sections,
                    metadata: {
                        ...caseStudy.metadata,
                        template_applied: {
                            template_id: templateId,
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

            // Track usage if enabled
            if (trackUsage) {
                await this.trackTemplateUsage(templateId, caseStudyId, {
                    usageType: 'applied',
                    variablesUsed: variables,
                    sectionMapping: sectionMapping,
                    applicationTime: applicationTime
                });
            }

            console.log(`✅ Template applied successfully in ${applicationTime}ms`);
            return {
                success: true,
                caseStudy: updatedCaseStudy,
                applicationTime: applicationTime,
                message: 'Template applied successfully'
            };

        } catch (error) {
            console.error('❌ Error in applyTemplate:', error);
            
            // Track failed usage
            try {
                await this.trackTemplateUsage(templateId, caseStudyId, {
                    usageType: 'applied',
                    success: false,
                    errorMessage: error.message
                });
            } catch (trackError) {
                console.warn('⚠️ Could not track failed usage:', trackError);
            }

            return {
                success: false,
                error: error.message,
                message: 'Failed to apply template'
            };
        }
    }

    /**
     * Preview template application without saving
     * @param {string} templateId - Template ID
     * @param {Object} variables - Variable values
     * @returns {Promise<Object>} Preview result
     */
    async previewTemplate(templateId, variables = {}) {
        try {
            console.log(`📋 Previewing template: ${templateId}`);

            // Get template
            const templateResult = await this.getTemplate(templateId);
            if (!templateResult.success) {
                throw new Error('Template not found');
            }

            const template = templateResult.template;

            // Process template content with variables
            const processedContent = this.processTemplateContent(
                template.template_data,
                variables
            );

            // Track preview usage
            await this.trackTemplateUsage(templateId, null, {
                usageType: 'previewed',
                variablesUsed: variables
            });

            console.log(`✅ Template preview generated`);
            return {
                success: true,
                preview: processedContent,
                template: {
                    id: template.id,
                    name: template.name,
                    description: template.description,
                    variables: template.variables
                },
                message: 'Template preview generated successfully'
            };

        } catch (error) {
            console.error('❌ Error in previewTemplate:', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to generate template preview'
            };
        }
    }

    /**
     * Process template content with variable replacement
     * @param {Object} templateData - Template content
     * @param {Object} variables - Variable values
     * @param {Object} options - Processing options
     * @returns {Object} Processed content
     */
    processTemplateContent(templateData, variables = {}, options = {}) {
        const { preserveExisting = false, existingContent = null } = options;

        // Deep clone template data to avoid mutations
        let processedData = JSON.parse(JSON.stringify(templateData));

        // Process string replacement recursively
        const processValue = (value) => {
            if (typeof value === 'string') {
                return this.replaceVariables(value, variables);
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

        // Handle conditional content
        processedData = this.processConditionals(processedData, variables);

        // Handle loops
        processedData = this.processLoops(processedData, variables);

        // Merge with existing content if preserving
        if (preserveExisting && existingContent) {
            processedData = this.mergeContent(existingContent, processedData);
        }

        return processedData;
    }

    /**
     * Replace variables in text content
     * @param {string} text - Text with variables
     * @param {Object} variables - Variable values
     * @returns {string} Text with variables replaced
     */
    replaceVariables(text, variables) {
        return text.replace(this.variablePattern, (match, variableName) => {
            const trimmedName = variableName.trim();
            
            // Support nested object access (e.g., {{user.name}})
            const value = this.getNestedValue(variables, trimmedName);
            
            return value !== undefined ? String(value) : match;
        });
    }

    /**
     * Process conditional content blocks
     * @param {Object} content - Content object
     * @param {Object} variables - Variable values
     * @returns {Object} Processed content
     */
    processConditionals(content, variables) {
        const processValue = (value) => {
            if (typeof value === 'string') {
                return value.replace(this.conditionalPattern, (match, condition, innerContent) => {
                    const shouldInclude = this.evaluateCondition(condition.trim(), variables);
                    return shouldInclude ? innerContent : '';
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

        return processValue(content);
    }

    /**
     * Process loop content blocks
     * @param {Object} content - Content object
     * @param {Object} variables - Variable values
     * @returns {Object} Processed content
     */
    processLoops(content, variables) {
        const processValue = (value) => {
            if (typeof value === 'string') {
                return value.replace(this.loopPattern, (match, arrayName, innerContent) => {
                    const array = this.getNestedValue(variables, arrayName.trim());
                    if (Array.isArray(array)) {
                        return array.map((item, index) => {
                            const loopVariables = { ...variables, item, index };
                            return this.replaceVariables(innerContent, loopVariables);
                        }).join('');
                    }
                    return '';
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

        return processValue(content);
    }

    /**
     * Evaluate a condition for conditional content
     * @param {string} condition - Condition string
     * @param {Object} variables - Variable values
     * @returns {boolean} Condition result
     */
    evaluateCondition(condition, variables) {
        try {
            // Simple condition evaluation (can be extended)
            // Supports: variable, !variable, variable === 'value', variable !== 'value'
            
            if (condition.includes('===')) {
                const [left, right] = condition.split('===').map(s => s.trim());
                const leftValue = this.getNestedValue(variables, left);
                const rightValue = right.replace(/['"]/g, ''); // Remove quotes
                return leftValue === rightValue;
            }
            
            if (condition.includes('!==')) {
                const [left, right] = condition.split('!==').map(s => s.trim());
                const leftValue = this.getNestedValue(variables, left);
                const rightValue = right.replace(/['"]/g, '');
                return leftValue !== rightValue;
            }
            
            if (condition.startsWith('!')) {
                const variableName = condition.substring(1);
                const value = this.getNestedValue(variables, variableName);
                return !value;
            }
            
            // Simple truthiness check
            const value = this.getNestedValue(variables, condition);
            return !!value;
            
        } catch (error) {
            console.warn('⚠️ Error evaluating condition:', condition, error);
            return false;
        }
    }

    /**
     * Get nested value from object using dot notation
     * @param {Object} obj - Object to search
     * @param {string} path - Dot notation path
     * @returns {*} Value or undefined
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }

    /**
     * Extract variables from template content
     * @param {Object} content - Template content
     * @returns {Array} Array of variable definitions
     */
    extractVariables(content) {
        const variables = new Set();
        
        const extractFromValue = (value) => {
            if (typeof value === 'string') {
                const matches = value.match(this.variablePattern);
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
            label: this.generateVariableLabel(name),
            description: `Variable: ${name}`,
            required: true,
            defaultValue: ''
        }));
    }

    /**
     * Generate a human-readable label for a variable
     * @param {string} variableName - Variable name
     * @returns {string} Human-readable label
     */
    generateVariableLabel(variableName) {
        return variableName
            .split(/[._-]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * Validate template content structure
     * @param {Object} content - Template content
     * @returns {Object} Validation result
     */
    validateTemplateContent(content) {
        const errors = [];

        try {
            // Check if content is valid JSON-like object
            if (!content || typeof content !== 'object') {
                errors.push('Template content must be a valid object');
                return { isValid: false, errors };
            }

            // Check for required fields based on template type
            const requiredFields = ['project_title'];
            for (const field of requiredFields) {
                if (!content[field]) {
                    errors.push(`Missing required field: ${field}`);
                }
            }

            // Validate sections structure if present
            if (content.sections && typeof content.sections !== 'object') {
                errors.push('Sections must be an object');
            }

            // Check for circular references in variables
            const variableNames = this.extractVariables(content).map(v => v.name);
            const contentString = JSON.stringify(content);
            
            for (const varName of variableNames) {
                const varPattern = new RegExp(`\\{\\{\\s*${varName}\\s*\\}\\}`, 'g');
                const matches = (contentString.match(varPattern) || []).length;
                if (matches > 10) { // Arbitrary limit to prevent excessive recursion
                    errors.push(`Variable ${varName} appears too many times (possible circular reference)`);
                }
            }

        } catch (error) {
            errors.push(`Content validation error: ${error.message}`);
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Track template usage
     * @param {string} templateId - Template ID
     * @param {string} caseStudyId - Case study ID (optional)
     * @param {Object} usageData - Usage data
     * @returns {Promise<Object>} Tracking result
     */
    async trackTemplateUsage(templateId, caseStudyId, usageData) {
        try {
            const {
                usageType = 'applied',
                variablesUsed = {},
                sectionMapping = {},
                applicationTime = null,
                success = true,
                errorMessage = null
            } = usageData;

            // Get current user
            const { data: { user } } = await this.supabase.auth.getUser();

            const { error } = await this.supabase
                .from(this.usageTable)
                .insert({
                    template_id: templateId,
                    case_study_id: caseStudyId,
                    user_id: user?.id,
                    usage_type: usageType,
                    variables_used: variablesUsed,
                    customizations_made: sectionMapping,
                    application_time_ms: applicationTime,
                    success: success,
                    error_message: errorMessage
                });

            if (error) {
                console.warn('⚠️ Could not track template usage:', error);
            }

            return { success: !error };

        } catch (error) {
            console.warn('⚠️ Error tracking template usage:', error);
            return { success: false };
        }
    }

    /**
     * Get template usage statistics
     * @param {string} templateId - Template ID
     * @returns {Promise<Object>} Usage statistics
     */
    async getTemplateUsageStats(templateId) {
        try {
            const { data: stats, error } = await this.supabase
                .from(this.usageTable)
                .select('usage_type, success, application_time_ms, created_at')
                .eq('template_id', templateId);

            if (error) {
                throw error;
            }

            const totalUsage = stats.length;
            const successfulApplications = stats.filter(s => s.usage_type === 'applied' && s.success).length;
            const previews = stats.filter(s => s.usage_type === 'previewed').length;
            const avgApplicationTime = stats
                .filter(s => s.application_time_ms)
                .reduce((sum, s, _, arr) => sum + s.application_time_ms / arr.length, 0);

            // Usage over time (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const recentUsage = stats.filter(s => new Date(s.created_at) >= thirtyDaysAgo);

            return {
                success: true,
                stats: {
                    total_usage: totalUsage,
                    successful_applications: successfulApplications,
                    previews: previews,
                    avg_application_time_ms: Math.round(avgApplicationTime),
                    recent_usage_30d: recentUsage.length,
                    success_rate: totalUsage > 0 ? (successfulApplications / totalUsage * 100).toFixed(1) : 0
                }
            };

        } catch (error) {
            console.error('❌ Error getting usage stats:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Create a new template version
     * @param {string} templateId - Template ID
     * @param {Object} versionData - Version data
     * @returns {Promise<Object>} Created version
     */
    async createTemplateVersion(templateId, versionData) {
        try {
            const {
                templateData,
                variables = [],
                versionName = null,
                changeSummary = null
            } = versionData;

            // Get current user
            const { data: { user }, error: userError } = await this.supabase.auth.getUser();
            if (userError || !user) {
                throw new Error('Authentication required');
            }

            // Get next version number
            const { data: lastVersion } = await this.supabase
                .from(this.versionsTable)
                .select('version_number')
                .eq('template_id', templateId)
                .order('version_number', { ascending: false })
                .limit(1)
                .single();

            const nextVersionNumber = lastVersion ? lastVersion.version_number + 1 : 1;

            // Mark previous version as not current
            if (nextVersionNumber > 1) {
                await this.supabase
                    .from(this.versionsTable)
                    .update({ is_current: false })
                    .eq('template_id', templateId)
                    .eq('is_current', true);
            }

            // Create new version
            const { data: newVersion, error } = await this.supabase
                .from(this.versionsTable)
                .insert({
                    template_id: templateId,
                    version_number: nextVersionNumber,
                    template_data: templateData,
                    variables: variables,
                    version_name: versionName,
                    change_summary: changeSummary,
                    is_current: true,
                    created_by: user.id
                })
                .select()
                .single();

            if (error) {
                throw error;
            }

            return {
                success: true,
                version: newVersion,
                message: `Version ${nextVersionNumber} created successfully`
            };

        } catch (error) {
            console.error('❌ Error creating template version:', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to create template version'
            };
        }
    }

    /**
     * Get template versions
     * @param {string} templateId - Template ID
     * @returns {Promise<Object>} Template versions
     */
    async getTemplateVersions(templateId) {
        try {
            const { data: versions, error } = await this.supabase
                .from(this.versionsTable)
                .select(`
                    *,
                    user_profiles!created_by(full_name, avatar_url)
                `)
                .eq('template_id', templateId)
                .order('version_number', { ascending: false });

            if (error) {
                throw error;
            }

            return {
                success: true,
                versions: versions || [],
                message: `Retrieved ${versions?.length || 0} versions`
            };

        } catch (error) {
            console.error('❌ Error getting template versions:', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to get template versions'
            };
        }
    }

    /**
     * Get template ratings
     * @param {string} templateId - Template ID
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Template ratings
     */
    async getTemplateRatings(templateId, options = {}) {
        try {
            const { limit = 20, offset = 0 } = options;

            const { data: ratings, error } = await this.supabase
                .from(this.ratingsTable)
                .select(`
                    *,
                    user_profiles!user_id(full_name, avatar_url)
                `)
                .eq('template_id', templateId)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) {
                throw error;
            }

            return {
                success: true,
                ratings: ratings || [],
                message: `Retrieved ${ratings?.length || 0} ratings`
            };

        } catch (error) {
            console.error('❌ Error getting template ratings:', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to get template ratings'
            };
        }
    }

    /**
     * Add or update template rating
     * @param {string} templateId - Template ID
     * @param {number} rating - Rating (1-5)
     * @param {string} review - Review text (optional)
     * @returns {Promise<Object>} Rating result
     */
    async rateTemplate(templateId, rating, review = null) {
        try {
            // Validate rating
            if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
                throw new Error('Rating must be an integer between 1 and 5');
            }

            // Get current user
            const { data: { user }, error: userError } = await this.supabase.auth.getUser();
            if (userError || !user) {
                throw new Error('Authentication required');
            }

            // Upsert rating
            const { data: newRating, error } = await this.supabase
                .from(this.ratingsTable)
                .upsert({
                    template_id: templateId,
                    user_id: user.id,
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

            return {
                success: true,
                rating: newRating,
                message: 'Rating submitted successfully'
            };

        } catch (error) {
            console.error('❌ Error rating template:', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to submit rating'
            };
        }
    }

    /**
     * Delete a template
     * @param {string} templateId - Template ID
     * @returns {Promise<Object>} Deletion result
     */
    async deleteTemplate(templateId) {
        try {
            console.log(`📋 Deleting template: ${templateId}`);

            // Soft delete by setting is_active to false
            const { error } = await this.supabase
                .from(this.templatesTable)
                .update({ 
                    is_active: false,
                    updated_at: new Date().toISOString()
                })
                .eq('id', templateId);

            if (error) {
                throw error;
            }

            console.log(`✅ Template deleted successfully`);
            return {
                success: true,
                message: 'Template deleted successfully'
            };

        } catch (error) {
            console.error('❌ Error deleting template:', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to delete template'
            };
        }
    }

    /**
     * Merge existing content with template content
     * @param {Object} existingContent - Existing content
     * @param {Object} templateContent - Template content
     * @returns {Object} Merged content
     */
    mergeContent(existingContent, templateContent) {
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

    /**
     * Apply section mapping to content
     * @param {Object} content - Content to map
     * @param {Object} sectionMapping - Section mapping rules
     * @returns {Object} Mapped content
     */
    applySectionMapping(content, sectionMapping) {
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
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TemplateService;
} else if (typeof window !== 'undefined') {
    window.TemplateService = TemplateService;
}

console.log('📋 TemplateService class loaded successfully');
/**
 * Analytics API Endpoints for CMS Enhancement System
 * 
 * This API provides comprehensive analytics functionality including:
 * - Event tracking endpoints
 * - Content analytics retrieval
 * - Custom report generation
 * - Performance insights and recommendations
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Import Analytics Service (server-side version)
const AnalyticsService = require('../js/analytics-service-server');

// Initialize analytics service
const analyticsService = new AnalyticsService(supabase);

// Rate limiting configuration
const rateLimits = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per minute

/**
 * Rate limiting middleware
 */
function rateLimit(req, res, next) {
    const clientId = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!rateLimits.has(clientId)) {
        rateLimits.set(clientId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return next();
    }
    
    const limit = rateLimits.get(clientId);
    
    if (now > limit.resetTime) {
        limit.count = 1;
        limit.resetTime = now + RATE_LIMIT_WINDOW;
        return next();
    }
    
    if (limit.count >= RATE_LIMIT_MAX_REQUESTS) {
        return res.status(429).json({
            error: 'Rate limit exceeded',
            message: 'Too many requests. Please try again later.',
            resetTime: limit.resetTime
        });
    }
    
    limit.count++;
    next();
}

/**
 * Authentication middleware
 */
async function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid authorization header' });
        }
        
        const token = authHeader.substring(7);
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        
        req.user = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
}

/**
 * Permission check middleware
 */
async function checkPermissions(requiredPermission) {
    return async (req, res, next) => {
        try {
            const { data: userProfile, error } = await supabase
                .from('user_profiles')
                .select('role, permissions')
                .eq('id', req.user.id)
                .single();
            
            if (error || !userProfile) {
                return res.status(403).json({ error: 'User profile not found' });
            }
            
            // Check if user has required permission
            const hasPermission = userProfile.role === 'admin' || 
                                userProfile.role === 'super_admin' ||
                                (userProfile.permissions && userProfile.permissions.includes(requiredPermission));
            
            if (!hasPermission) {
                return res.status(403).json({ 
                    error: 'Insufficient permissions',
                    required: requiredPermission 
                });
            }
            
            req.userProfile = userProfile;
            next();
        } catch (error) {
            console.error('Permission check error:', error);
            res.status(500).json({ error: 'Permission check failed' });
        }
    };
}

/**
 * Error handling middleware
 */
function handleError(error, req, res, next) {
    console.error('API Error:', error);
    
    if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Resource not found' });
    }
    
    if (error.code === '23505') {
        return res.status(409).json({ error: 'Resource already exists' });
    }
    
    if (error.message.includes('JWT')) {
        return res.status(401).json({ error: 'Invalid authentication token' });
    }
    
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
}

/**
 * Input validation helper
 */
function validateInput(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.details.map(d => d.message)
            });
        }
        req.validatedBody = value;
        next();
    };
}

// Validation schemas (using Joi-like structure)
const eventTrackingSchema = {
    validate: (data) => {
        const required = ['eventType', 'eventCategory', 'eventAction'];
        const missing = required.filter(field => !data[field]);
        
        if (missing.length > 0) {
            return { error: { details: [`Missing required fields: ${missing.join(', ')}`] } };
        }
        
        return { value: data };
    }
};

const reportConfigSchema = {
    validate: (data) => {
        if (!data.dateRange || !data.dateRange.startDate || !data.dateRange.endDate) {
            return { error: { details: ['dateRange with startDate and endDate is required'] } };
        }
        
        return { value: data };
    }
};

/**
 * ANALYTICS API ENDPOINTS
 */

module.exports = function(app) {
    // Apply rate limiting to all analytics endpoints
    app.use('/api/analytics', rateLimit);

    /**
     * POST /api/analytics/track
     * Track analytics events
     */
    app.post('/api/analytics/track', 
        validateInput(eventTrackingSchema),
        async (req, res) => {
            try {
                const eventData = {
                    ...req.validatedBody,
                    user_id: req.user?.id || null,
                    ip_address: req.ip,
                    user_agent: req.headers['user-agent'],
                    created_at: new Date().toISOString()
                };

                const result = await analyticsService.trackEvent(eventData, true);
                
                res.status(201).json({
                    success: true,
                    message: 'Event tracked successfully',
                    eventId: result?.[0]?.id,
                    timestamp: eventData.created_at
                });
            } catch (error) {
                handleError(error, req, res);
            }
        }
    );

    /**
     * POST /api/analytics/track/batch
     * Track multiple analytics events in batch
     */
    app.post('/api/analytics/track/batch',
        authenticate,
        async (req, res) => {
            try {
                const { events } = req.body;
                
                if (!Array.isArray(events) || events.length === 0) {
                    return res.status(400).json({ error: 'Events array is required' });
                }
                
                if (events.length > 100) {
                    return res.status(400).json({ error: 'Maximum 100 events per batch' });
                }

                const enrichedEvents = events.map(event => ({
                    ...event,
                    user_id: req.user.id,
                    ip_address: req.ip,
                    user_agent: req.headers['user-agent'],
                    created_at: new Date().toISOString()
                }));

                const { data, error } = await supabase
                    .from('analytics_events')
                    .insert(enrichedEvents);

                if (error) throw error;

                res.status(201).json({
                    success: true,
                    message: `${events.length} events tracked successfully`,
                    eventsProcessed: events.length,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                handleError(error, req, res);
            }
        }
    );

    /**
     * GET /api/analytics/content/:id
     * Get analytics for specific content
     */
    app.get('/api/analytics/content/:id',
        authenticate,
        checkPermissions('analytics_read'),
        async (req, res) => {
            try {
                const { id } = req.params;
                const { 
                    contentType = 'case_study',
                    startDate,
                    endDate,
                    periodType = 'daily'
                } = req.query;

                const start = startDate ? new Date(startDate) : new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
                const end = endDate ? new Date(endDate) : new Date();

                const analytics = await analyticsService.aggregateContentAnalytics(
                    contentType,
                    id,
                    start,
                    end,
                    periodType
                );

                res.json({
                    success: true,
                    data: analytics,
                    metadata: {
                        contentId: id,
                        contentType,
                        dateRange: { startDate: start, endDate: end },
                        periodType,
                        generatedAt: new Date().toISOString()
                    }
                });
            } catch (error) {
                handleError(error, req, res);
            }
        }
    );

    /**
     * GET /api/analytics/user/:userId
     * Get user behavior analytics
     */
    app.get('/api/analytics/user/:userId',
        authenticate,
        checkPermissions('analytics_read'),
        async (req, res) => {
            try {
                const { userId } = req.params;
                const { 
                    startDate,
                    endDate,
                    periodType = 'daily'
                } = req.query;

                // Check if user can access this user's analytics
                if (req.user.id !== userId && req.userProfile.role !== 'admin' && req.userProfile.role !== 'super_admin') {
                    return res.status(403).json({ error: 'Cannot access other user analytics' });
                }

                const start = startDate ? new Date(startDate) : new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
                const end = endDate ? new Date(endDate) : new Date();

                const analytics = await analyticsService.aggregateUserBehaviorAnalytics(
                    userId,
                    start,
                    end,
                    periodType
                );

                res.json({
                    success: true,
                    data: analytics,
                    metadata: {
                        userId,
                        dateRange: { startDate: start, endDate: end },
                        periodType,
                        generatedAt: new Date().toISOString()
                    }
                });
            } catch (error) {
                handleError(error, req, res);
            }
        }
    );

    /**
     * GET /api/analytics/insights/content/:id
     * Get performance insights for content
     */
    app.get('/api/analytics/insights/content/:id',
        authenticate,
        checkPermissions('analytics_read'),
        async (req, res) => {
            try {
                const { id } = req.params;
                const { 
                    contentType = 'case_study',
                    days = 30
                } = req.query;

                const insights = await analyticsService.generateContentInsights(
                    contentType,
                    id,
                    parseInt(days)
                );

                res.json({
                    success: true,
                    data: insights,
                    metadata: {
                        contentId: id,
                        contentType,
                        analysisPeriod: days,
                        generatedAt: new Date().toISOString()
                    }
                });
            } catch (error) {
                handleError(error, req, res);
            }
        }
    );

    /**
     * GET /api/analytics/insights/system
     * Get system-wide performance insights
     */
    app.get('/api/analytics/insights/system',
        authenticate,
        checkPermissions('analytics_admin'),
        async (req, res) => {
            try {
                const { days = 30 } = req.query;

                const insights = await analyticsService.generateSystemInsights(parseInt(days));

                res.json({
                    success: true,
                    data: insights,
                    metadata: {
                        analysisPeriod: days,
                        generatedAt: new Date().toISOString()
                    }
                });
            } catch (error) {
                handleError(error, req, res);
            }
        }
    );

    /**
     * POST /api/analytics/reports
     * Generate custom analytics report
     */
    app.post('/api/analytics/reports',
        authenticate,
        checkPermissions('analytics_read'),
        validateInput(reportConfigSchema),
        async (req, res) => {
            try {
                const reportConfig = {
                    ...req.validatedBody,
                    generatedBy: req.user.id,
                    generatedAt: new Date().toISOString()
                };

                const report = await analyticsService.generateCustomReport(reportConfig);

                // Save report to database for future reference
                const { data: savedReport, error } = await supabase
                    .from('custom_reports')
                    .insert({
                        report_name: reportConfig.name || 'Custom Report',
                        report_description: reportConfig.description,
                        report_type: reportConfig.reportType || 'export',
                        report_config: reportConfig,
                        created_by: req.user.id,
                        is_public: reportConfig.isPublic || false
                    })
                    .select()
                    .single();

                if (error) {
                    console.warn('Failed to save report:', error);
                }

                res.json({
                    success: true,
                    data: report,
                    reportId: savedReport?.id,
                    metadata: {
                        generatedBy: req.user.id,
                        generatedAt: reportConfig.generatedAt,
                        config: reportConfig
                    }
                });
            } catch (error) {
                handleError(error, req, res);
            }
        }
    );

    /**
     * GET /api/analytics/reports
     * List saved reports
     */
    app.get('/api/analytics/reports',
        authenticate,
        checkPermissions('analytics_read'),
        async (req, res) => {
            try {
                const { 
                    page = 1, 
                    limit = 20, 
                    reportType,
                    isPublic 
                } = req.query;

                const offset = (page - 1) * limit;

                let query = supabase
                    .from('custom_reports')
                    .select(`
                        id,
                        report_name,
                        report_description,
                        report_type,
                        is_public,
                        created_at,
                        updated_at,
                        view_count,
                        last_viewed_at,
                        user_profiles!created_by (
                            id,
                            full_name,
                            email
                        )
                    `)
                    .order('created_at', { ascending: false })
                    .range(offset, offset + limit - 1);

                // Filter by user's reports or public reports
                if (req.userProfile.role !== 'admin' && req.userProfile.role !== 'super_admin') {
                    query = query.or(`created_by.eq.${req.user.id},is_public.eq.true`);
                }

                if (reportType) {
                    query = query.eq('report_type', reportType);
                }

                if (isPublic !== undefined) {
                    query = query.eq('is_public', isPublic === 'true');
                }

                const { data: reports, error, count } = await query;

                if (error) throw error;

                res.json({
                    success: true,
                    data: reports,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: count,
                        totalPages: Math.ceil(count / limit)
                    }
                });
            } catch (error) {
                handleError(error, req, res);
            }
        }
    );

    /**
     * GET /api/analytics/reports/:id
     * Get specific report
     */
    app.get('/api/analytics/reports/:id',
        authenticate,
        checkPermissions('analytics_read'),
        async (req, res) => {
            try {
                const { id } = req.params;

                const { data: report, error } = await supabase
                    .from('custom_reports')
                    .select(`
                        *,
                        user_profiles!created_by (
                            id,
                            full_name,
                            email
                        )
                    `)
                    .eq('id', id)
                    .single();

                if (error) throw error;

                // Check permissions
                if (!report.is_public && 
                    report.created_by !== req.user.id && 
                    req.userProfile.role !== 'admin' && 
                    req.userProfile.role !== 'super_admin') {
                    return res.status(403).json({ error: 'Access denied to this report' });
                }

                // Update view count
                await supabase
                    .from('custom_reports')
                    .update({ 
                        view_count: (report.view_count || 0) + 1,
                        last_viewed_at: new Date().toISOString()
                    })
                    .eq('id', id);

                res.json({
                    success: true,
                    data: report
                });
            } catch (error) {
                handleError(error, req, res);
            }
        }
    );

    /**
     * POST /api/analytics/reports/:id/execute
     * Re-execute a saved report
     */
    app.post('/api/analytics/reports/:id/execute',
        authenticate,
        checkPermissions('analytics_read'),
        async (req, res) => {
            try {
                const { id } = req.params;

                const { data: report, error } = await supabase
                    .from('custom_reports')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;

                // Check permissions
                if (!report.is_public && 
                    report.created_by !== req.user.id && 
                    req.userProfile.role !== 'admin' && 
                    req.userProfile.role !== 'super_admin') {
                    return res.status(403).json({ error: 'Access denied to this report' });
                }

                // Execute the report
                const executionStart = Date.now();
                const reportData = await analyticsService.generateCustomReport(report.report_config);
                const executionTime = Date.now() - executionStart;

                // Log execution
                await supabase
                    .from('report_executions')
                    .insert({
                        report_id: id,
                        executed_by: req.user.id,
                        execution_type: 'manual',
                        status: 'completed',
                        result_data: reportData,
                        execution_time_ms: executionTime,
                        rows_returned: reportData.data?.length || 0,
                        started_at: new Date(Date.now() - executionTime).toISOString(),
                        completed_at: new Date().toISOString()
                    });

                res.json({
                    success: true,
                    data: reportData,
                    execution: {
                        executionTime,
                        rowsReturned: reportData.data?.length || 0,
                        executedAt: new Date().toISOString()
                    }
                });
            } catch (error) {
                handleError(error, req, res);
            }
        }
    );

    /**
     * POST /api/analytics/funnel
     * Generate funnel analysis
     */
    app.post('/api/analytics/funnel',
        authenticate,
        checkPermissions('analytics_read'),
        async (req, res) => {
            try {
                const { 
                    funnelSteps,
                    startDate,
                    endDate,
                    filters = {}
                } = req.body;

                if (!Array.isArray(funnelSteps) || funnelSteps.length === 0) {
                    return res.status(400).json({ error: 'Funnel steps array is required' });
                }

                const start = new Date(startDate);
                const end = new Date(endDate);

                const funnelReport = await analyticsService.generateFunnelReport(
                    funnelSteps,
                    start,
                    end,
                    filters
                );

                res.json({
                    success: true,
                    data: funnelReport,
                    metadata: {
                        dateRange: { startDate: start, endDate: end },
                        stepsCount: funnelSteps.length,
                        generatedAt: new Date().toISOString()
                    }
                });
            } catch (error) {
                handleError(error, req, res);
            }
        }
    );

    /**
     * GET /api/analytics/dashboard
     * Get dashboard analytics summary
     */
    app.get('/api/analytics/dashboard',
        authenticate,
        checkPermissions('analytics_read'),
        async (req, res) => {
            try {
                const { days = 7 } = req.query;
                const endDate = new Date();
                const startDate = new Date(endDate.getTime() - (parseInt(days) * 24 * 60 * 60 * 1000));

                // Get multiple analytics in parallel
                const [
                    totalEvents,
                    uniqueUsers,
                    topContent,
                    systemInsights,
                    performanceMetrics
                ] = await Promise.all([
                    analyticsService.getTotalEvents(startDate, endDate),
                    analyticsService.getUniqueUsers(startDate, endDate),
                    analyticsService.getTopPerformingContent(startDate, endDate, 5),
                    analyticsService.generateSystemInsights(parseInt(days)),
                    analyticsService.getSystemPerformanceMetrics(startDate, endDate)
                ]);

                const dashboard = {
                    overview: {
                        totalEvents,
                        uniqueUsers,
                        avgEventsPerUser: totalEvents / Math.max(uniqueUsers, 1),
                        systemHealthScore: systemInsights.systemHealth.score,
                        systemStatus: systemInsights.systemHealth.status
                    },
                    topContent,
                    performance: performanceMetrics,
                    insights: systemInsights.recommendations.slice(0, 3), // Top 3 recommendations
                    dateRange: { startDate, endDate },
                    generatedAt: new Date().toISOString()
                };

                res.json({
                    success: true,
                    data: dashboard
                });
            } catch (error) {
                handleError(error, req, res);
            }
        }
    );

    /**
     * GET /api/analytics/export/:reportId
     * Export report in various formats
     */
    app.get('/api/analytics/export/:reportId',
        authenticate,
        checkPermissions('analytics_read'),
        async (req, res) => {
            try {
                const { reportId } = req.params;
                const { format = 'json' } = req.query;

                // Get the latest execution of the report
                const { data: execution, error } = await supabase
                    .from('report_executions')
                    .select(`
                        *,
                        custom_reports!report_id (
                            report_name,
                            created_by,
                            is_public
                        )
                    `)
                    .eq('report_id', reportId)
                    .eq('status', 'completed')
                    .order('completed_at', { ascending: false })
                    .limit(1)
                    .single();

                if (error) throw error;

                // Check permissions
                const report = execution.custom_reports;
                if (!report.is_public && 
                    report.created_by !== req.user.id && 
                    req.userProfile.role !== 'admin' && 
                    req.userProfile.role !== 'super_admin') {
                    return res.status(403).json({ error: 'Access denied to this report' });
                }

                const reportData = execution.result_data;
                
                switch (format.toLowerCase()) {
                    case 'csv':
                        const csvData = analyticsService.convertToCSV(reportData.data);
                        res.setHeader('Content-Type', 'text/csv');
                        res.setHeader('Content-Disposition', `attachment; filename="${report.report_name}.csv"`);
                        res.send(csvData);
                        break;
                        
                    case 'json':
                        res.setHeader('Content-Type', 'application/json');
                        res.setHeader('Content-Disposition', `attachment; filename="${report.report_name}.json"`);
                        res.json(reportData);
                        break;
                        
                    default:
                        res.status(400).json({ error: 'Unsupported export format' });
                }
            } catch (error) {
                handleError(error, req, res);
            }
        }
    );

    /**
     * GET /api/analytics/health
     * API health check and status
     */
    app.get('/api/analytics/health', async (req, res) => {
        try {
            const startTime = Date.now();
            
            // Test database connection
            const { data, error } = await supabase
                .from('analytics_events')
                .select('count', { count: 'exact', head: true })
                .limit(1);

            const responseTime = Date.now() - startTime;

            if (error) {
                return res.status(503).json({
                    status: 'unhealthy',
                    error: 'Database connection failed',
                    responseTime
                });
            }

            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                responseTime,
                database: {
                    connected: true,
                    totalEvents: data || 0
                },
                analytics: {
                    serviceInitialized: !!analyticsService,
                    cacheSize: analyticsService.cache?.size || 0
                }
            });
        } catch (error) {
            res.status(503).json({
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    /**
     * Error handling for all analytics routes
     */
    app.use('/api/analytics', handleError);
};
/**
 * Advanced Analytics Service for CMS Enhancement System
 * 
 * This service provides comprehensive analytics functionality including:
 * - Event tracking for content interactions
 * - Analytics data aggregation and summarization
 * - Performance insights and recommendation engine
 * - Custom analytics report generation
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10
 */

class AnalyticsService {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.eventQueue = [];
        this.batchSize = 50;
        this.flushInterval = 5000; // 5 seconds
        this.isProcessing = false;
        
        // Start batch processing
        this.startBatchProcessing();
        
        // Performance monitoring
        this.performanceObserver = null;
        this.initializePerformanceMonitoring();
        
        // Cache for frequently accessed data
        this.cache = new Map();
        this.cacheTimeout = 300000; // 5 minutes
    }

    /**
     * Event Tracking Methods
     */

    /**
     * Track a user event with comprehensive context
     * @param {Object} eventData - Event data object
     * @param {string} eventData.eventType - Type of event (page_view, content_view, etc.)
     * @param {string} eventData.eventCategory - Category (user_interaction, content, system, etc.)
     * @param {string} eventData.eventAction - Action (view, create, edit, delete, etc.)
     * @param {string} [eventData.eventLabel] - Additional context
     * @param {Object} [eventData.properties] - Custom event properties
     * @param {number} [eventData.value] - Numeric value for the event
     * @param {boolean} [immediate=false] - Whether to send immediately or batch
     */
    async trackEvent(eventData, immediate = false) {
        try {
            const enrichedEvent = await this.enrichEventData(eventData);
            
            if (immediate) {
                return await this.sendEvent(enrichedEvent);
            } else {
                this.eventQueue.push(enrichedEvent);
                
                // Flush if queue is full
                if (this.eventQueue.length >= this.batchSize) {
                    await this.flushEventQueue();
                }
            }
        } catch (error) {
            console.error('Error tracking event:', error);
            throw error;
        }
    }

    /**
     * Track page view with performance metrics
     * @param {Object} pageData - Page view data
     */
    async trackPageView(pageData) {
        const performanceData = this.getPagePerformanceMetrics();
        
        return await this.trackEvent({
            eventType: 'page_view',
            eventCategory: 'user_interaction',
            eventAction: 'view',
            eventLabel: pageData.pageTitle,
            properties: {
                page_url: pageData.pageUrl,
                page_title: pageData.pageTitle,
                referrer: pageData.referrer,
                ...performanceData
            },
            pageLoadTime: performanceData.loadTime,
            timeOnPage: pageData.timeOnPage || 0,
            scrollDepth: pageData.scrollDepth || 0
        });
    }

    /**
     * Track content interaction (case study, template, etc.)
     * @param {Object} contentData - Content interaction data
     */
    async trackContentInteraction(contentData) {
        return await this.trackEvent({
            eventType: 'content_view',
            eventCategory: 'content',
            eventAction: contentData.action || 'view',
            eventLabel: contentData.contentTitle,
            properties: {
                content_type: contentData.contentType,
                content_id: contentData.contentId,
                interaction_type: contentData.interactionType,
                duration: contentData.duration,
                completion_rate: contentData.completionRate
            },
            caseStudyId: contentData.contentType === 'case_study' ? contentData.contentId : null,
            templateId: contentData.contentType === 'template' ? contentData.contentId : null
        });
    }

    /**
     * Track user session data
     * @param {Object} sessionData - Session data
     */
    async trackSession(sessionData) {
        try {
            const { data, error } = await this.supabase
                .from('user_sessions')
                .upsert({
                    session_id: sessionData.sessionId,
                    user_id: sessionData.userId,
                    anonymous_id: sessionData.anonymousId,
                    started_at: sessionData.startedAt || new Date().toISOString(),
                    ended_at: sessionData.endedAt,
                    duration_seconds: sessionData.durationSeconds,
                    page_views: sessionData.pageViews || 0,
                    events_count: sessionData.eventsCount || 0,
                    bounce_rate: sessionData.bounceRate || false,
                    entry_page: sessionData.entryPage,
                    exit_page: sessionData.exitPage,
                    referrer_url: sessionData.referrerUrl,
                    utm_source: sessionData.utmSource,
                    utm_medium: sessionData.utmMedium,
                    utm_campaign: sessionData.utmCampaign,
                    utm_term: sessionData.utmTerm,
                    utm_content: sessionData.utmContent,
                    ip_address: sessionData.ipAddress,
                    user_agent: sessionData.userAgent,
                    device_type: sessionData.deviceType,
                    browser_name: sessionData.browserName,
                    os_name: sessionData.osName,
                    country_code: sessionData.countryCode,
                    region: sessionData.region,
                    city: sessionData.city,
                    timezone: sessionData.timezone,
                    converted: sessionData.converted || false,
                    conversion_value: sessionData.conversionValue,
                    conversion_type: sessionData.conversionType
                }, {
                    onConflict: 'session_id'
                });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error tracking session:', error);
            throw error;
        }
    }

    /**
     * Data Aggregation and Summarization Methods
     */

    /**
     * Aggregate content analytics for a specific time period
     * @param {string} contentType - Type of content (case_study, template, etc.)
     * @param {string} contentId - Content ID
     * @param {Date} startDate - Start date for aggregation
     * @param {Date} endDate - End date for aggregation
     * @param {string} periodType - Period type (daily, weekly, monthly)
     */
    async aggregateContentAnalytics(contentType, contentId, startDate, endDate, periodType = 'daily') {
        try {
            const cacheKey = `content_analytics_${contentType}_${contentId}_${periodType}_${startDate}_${endDate}`;
            const cached = this.getFromCache(cacheKey);
            if (cached) return cached;

            // Get raw analytics events
            const { data: events, error } = await this.supabase
                .from('analytics_events')
                .select('*')
                .eq('event_category', 'content')
                .gte('created_at', startDate.toISOString())
                .lte('created_at', endDate.toISOString())
                .or(`case_study_id.eq.${contentId},template_id.eq.${contentId}`);

            if (error) throw error;

            // Aggregate data by period
            const aggregatedData = this.aggregateEventsByPeriod(events, periodType);

            // Calculate metrics
            const analytics = {
                contentType,
                contentId,
                periodType,
                startDate,
                endDate,
                totalViews: events.length,
                uniqueViews: new Set(events.map(e => e.user_id || e.anonymous_id)).size,
                avgTimeOnContent: this.calculateAverageTimeOnContent(events),
                bounceRate: this.calculateBounceRate(events),
                conversionRate: this.calculateConversionRate(events),
                topCountries: this.getTopCountries(events),
                deviceBreakdown: this.getDeviceBreakdown(events),
                trafficSources: this.getTrafficSources(events),
                performanceMetrics: this.calculatePerformanceMetrics(events),
                periodData: aggregatedData
            };

            this.setCache(cacheKey, analytics);
            return analytics;
        } catch (error) {
            console.error('Error aggregating content analytics:', error);
            throw error;
        }
    }

    /**
     * Aggregate user behavior analytics
     * @param {string} userId - User ID
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @param {string} periodType - Period type
     */
    async aggregateUserBehaviorAnalytics(userId, startDate, endDate, periodType = 'daily') {
        try {
            const cacheKey = `user_behavior_${userId}_${periodType}_${startDate}_${endDate}`;
            const cached = this.getFromCache(cacheKey);
            if (cached) return cached;

            // Get user events and sessions
            const [eventsResult, sessionsResult] = await Promise.all([
                this.supabase
                    .from('analytics_events')
                    .select('*')
                    .eq('user_id', userId)
                    .gte('created_at', startDate.toISOString())
                    .lte('created_at', endDate.toISOString()),
                this.supabase
                    .from('user_sessions')
                    .select('*')
                    .eq('user_id', userId)
                    .gte('started_at', startDate.toISOString())
                    .lte('started_at', endDate.toISOString())
            ]);

            if (eventsResult.error) throw eventsResult.error;
            if (sessionsResult.error) throw sessionsResult.error;

            const events = eventsResult.data;
            const sessions = sessionsResult.data;

            const analytics = {
                userId,
                periodType,
                startDate,
                endDate,
                sessionsCount: sessions.length,
                totalSessionDuration: sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0),
                avgSessionDuration: sessions.length > 0 ? 
                    sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / sessions.length : 0,
                pagesPerSession: sessions.length > 0 ? 
                    sessions.reduce((sum, s) => sum + (s.page_views || 0), 0) / sessions.length : 0,
                caseStudiesViewed: events.filter(e => e.event_type === 'content_view' && e.case_study_id).length,
                caseStudiesCreated: events.filter(e => e.event_action === 'create' && e.case_study_id).length,
                caseStudiesEdited: events.filter(e => e.event_action === 'edit' && e.case_study_id).length,
                templatesUsed: events.filter(e => e.event_action === 'apply' && e.template_id).length,
                templatesCreated: events.filter(e => e.event_action === 'create' && e.template_id).length,
                totalTimeSpent: events.reduce((sum, e) => sum + (e.time_on_page || 0), 0),
                actionsPerformed: events.length,
                featuresUsed: [...new Set(events.map(e => e.event_type))],
                conversionsCount: events.filter(e => e.event_category === 'conversion').length,
                conversionTypes: [...new Set(events.filter(e => e.event_category === 'conversion').map(e => e.event_label))],
                primaryDevice: this.getPrimaryDevice(sessions),
                devicesUsed: [...new Set(sessions.map(s => s.device_type).filter(Boolean))]
            };

            this.setCache(cacheKey, analytics);
            return analytics;
        } catch (error) {
            console.error('Error aggregating user behavior analytics:', error);
            throw error;
        }
    }

    /**
     * Performance Insights and Recommendation Engine
     */

    /**
     * Generate performance insights for content
     * @param {string} contentType - Content type
     * @param {string} contentId - Content ID
     * @param {number} days - Number of days to analyze
     */
    async generateContentInsights(contentType, contentId, days = 30) {
        try {
            const endDate = new Date();
            const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

            const analytics = await this.aggregateContentAnalytics(contentType, contentId, startDate, endDate);
            
            const insights = {
                contentType,
                contentId,
                analysisDate: new Date(),
                analysisPeriod: days,
                performance: {
                    score: this.calculatePerformanceScore(analytics),
                    trend: await this.calculateTrend(contentType, contentId, days),
                    ranking: await this.getContentRanking(contentType, contentId)
                },
                recommendations: await this.generateRecommendations(analytics),
                benchmarks: await this.getBenchmarkComparisons(contentType, analytics),
                opportunities: this.identifyOptimizationOpportunities(analytics)
            };

            return insights;
        } catch (error) {
            console.error('Error generating content insights:', error);
            throw error;
        }
    }

    /**
     * Generate system-wide performance insights
     * @param {number} days - Number of days to analyze
     */
    async generateSystemInsights(days = 30) {
        try {
            const endDate = new Date();
            const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

            // Get system-wide metrics
            const [
                totalEvents,
                uniqueUsers,
                topContent,
                performanceMetrics,
                errorRates
            ] = await Promise.all([
                this.getTotalEvents(startDate, endDate),
                this.getUniqueUsers(startDate, endDate),
                this.getTopPerformingContent(startDate, endDate),
                this.getSystemPerformanceMetrics(startDate, endDate),
                this.getErrorRates(startDate, endDate)
            ]);

            const insights = {
                analysisDate: new Date(),
                analysisPeriod: days,
                systemHealth: {
                    score: this.calculateSystemHealthScore({
                        totalEvents,
                        uniqueUsers,
                        performanceMetrics,
                        errorRates
                    }),
                    status: this.getSystemHealthStatus(errorRates, performanceMetrics)
                },
                usage: {
                    totalEvents,
                    uniqueUsers,
                    avgEventsPerUser: totalEvents / Math.max(uniqueUsers, 1),
                    growth: await this.calculateGrowthRate(startDate, endDate)
                },
                performance: performanceMetrics,
                topContent,
                recommendations: this.generateSystemRecommendations({
                    totalEvents,
                    uniqueUsers,
                    performanceMetrics,
                    errorRates,
                    topContent
                })
            };

            return insights;
        } catch (error) {
            console.error('Error generating system insights:', error);
            throw error;
        }
    }

    /**
     * Custom Analytics Report Generation
     */

    /**
     * Generate custom analytics report
     * @param {Object} reportConfig - Report configuration
     */
    async generateCustomReport(reportConfig) {
        try {
            const {
                reportType,
                dateRange,
                filters,
                metrics,
                dimensions,
                visualization,
                format = 'json'
            } = reportConfig;

            // Build query based on configuration
            const queryBuilder = this.buildCustomQuery(reportConfig);
            const data = await this.executeCustomQuery(queryBuilder);

            // Process and format data
            const processedData = this.processReportData(data, reportConfig);

            // Generate visualizations if requested
            const visualizations = visualization ? 
                await this.generateVisualizations(processedData, visualization) : null;

            const report = {
                id: this.generateReportId(),
                name: reportConfig.name || 'Custom Report',
                description: reportConfig.description,
                generatedAt: new Date(),
                config: reportConfig,
                data: processedData,
                visualizations,
                summary: this.generateReportSummary(processedData),
                metadata: {
                    totalRecords: processedData.length,
                    dateRange: dateRange,
                    filters: filters,
                    executionTime: Date.now() - this.reportStartTime
                }
            };

            // Format output based on requested format
            return this.formatReportOutput(report, format);
        } catch (error) {
            console.error('Error generating custom report:', error);
            throw error;
        }
    }

    /**
     * Generate funnel analysis report
     * @param {Array} funnelSteps - Array of funnel step definitions
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @param {Object} filters - Additional filters
     */
    async generateFunnelReport(funnelSteps, startDate, endDate, filters = {}) {
        try {
            const funnelData = [];

            for (let i = 0; i < funnelSteps.length; i++) {
                const step = funnelSteps[i];
                const stepData = await this.getFunnelStepData(step, startDate, endDate, filters);
                
                funnelData.push({
                    stepName: step.name,
                    stepOrder: i + 1,
                    usersEntered: stepData.usersEntered,
                    usersCompleted: stepData.usersCompleted,
                    completionRate: stepData.usersEntered > 0 ? 
                        (stepData.usersCompleted / stepData.usersEntered) * 100 : 0,
                    dropOffRate: stepData.usersEntered > 0 ? 
                        ((stepData.usersEntered - stepData.usersCompleted) / stepData.usersEntered) * 100 : 0,
                    avgTimeToComplete: stepData.avgTimeToComplete,
                    conversionValue: stepData.conversionValue
                });
            }

            return {
                funnelName: filters.funnelName || 'Custom Funnel',
                dateRange: { startDate, endDate },
                steps: funnelData,
                overallConversionRate: this.calculateOverallConversionRate(funnelData),
                totalUsers: funnelData[0]?.usersEntered || 0,
                totalConversions: funnelData[funnelData.length - 1]?.usersCompleted || 0,
                insights: this.generateFunnelInsights(funnelData)
            };
        } catch (error) {
            console.error('Error generating funnel report:', error);
            throw error;
        }
    }

    /**
     * Helper Methods
     */

    /**
     * Enrich event data with additional context
     * @param {Object} eventData - Raw event data
     */
    async enrichEventData(eventData) {
        const enriched = {
            ...eventData,
            created_at: new Date().toISOString(),
            session_id: this.getSessionId(),
            user_agent: navigator.userAgent,
            page_url: window.location.href,
            page_title: document.title,
            referrer_url: document.referrer,
            device_type: this.getDeviceType(),
            browser_name: this.getBrowserName(),
            os_name: this.getOSName(),
            screen_resolution: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };

        // Add geographic information if available
        const geoData = await this.getGeographicData();
        if (geoData) {
            enriched.country_code = geoData.countryCode;
            enriched.region = geoData.region;
            enriched.city = geoData.city;
        }

        return enriched;
    }

    /**
     * Send event to database
     * @param {Object} eventData - Enriched event data
     */
    async sendEvent(eventData) {
        try {
            const { data, error } = await this.supabase
                .from('analytics_events')
                .insert([eventData]);

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error sending event:', error);
            throw error;
        }
    }

    /**
     * Flush event queue (batch processing)
     */
    async flushEventQueue() {
        if (this.isProcessing || this.eventQueue.length === 0) return;

        this.isProcessing = true;
        const eventsToProcess = [...this.eventQueue];
        this.eventQueue = [];

        try {
            const { data, error } = await this.supabase
                .from('analytics_events')
                .insert(eventsToProcess);

            if (error) throw error;
            
            console.log(`Flushed ${eventsToProcess.length} events to analytics`);
            return data;
        } catch (error) {
            console.error('Error flushing event queue:', error);
            // Re-add events to queue for retry
            this.eventQueue.unshift(...eventsToProcess);
            throw error;
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Start batch processing timer
     */
    startBatchProcessing() {
        setInterval(() => {
            if (this.eventQueue.length > 0) {
                this.flushEventQueue().catch(console.error);
            }
        }, this.flushInterval);
    }

    /**
     * Initialize performance monitoring
     */
    initializePerformanceMonitoring() {
        if ('PerformanceObserver' in window) {
            this.performanceObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach(entry => {
                    this.trackPerformanceMetric(entry);
                });
            });

            this.performanceObserver.observe({ 
                entryTypes: ['navigation', 'resource', 'measure', 'paint'] 
            });
        }
    }

    /**
     * Track performance metric
     * @param {PerformanceEntry} entry - Performance entry
     */
    async trackPerformanceMetric(entry) {
        const metricData = {
            metricName: entry.name,
            metricCategory: entry.entryType,
            avgValue: entry.duration || entry.startTime,
            minValue: entry.duration || entry.startTime,
            maxValue: entry.duration || entry.startTime,
            medianValue: entry.duration || entry.startTime,
            sampleCount: 1,
            datePeriod: new Date().toISOString().split('T')[0],
            periodType: 'daily',
            pageUrl: window.location.pathname
        };

        // Aggregate with existing data
        await this.aggregatePerformanceMetric(metricData);
    }

    /**
     * Get page performance metrics
     */
    getPagePerformanceMetrics() {
        const navigation = performance.getEntriesByType('navigation')[0];
        const paint = performance.getEntriesByType('paint');

        return {
            loadTime: navigation ? Math.round(navigation.loadEventEnd - navigation.fetchStart) : 0,
            domContentLoaded: navigation ? Math.round(navigation.domContentLoadedEventEnd - navigation.fetchStart) : 0,
            firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
            firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
            timeToInteractive: navigation ? Math.round(navigation.domInteractive - navigation.fetchStart) : 0
        };
    }

    /**
     * Cache management methods
     */
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Utility methods for device/browser detection
     */
    getDeviceType() {
        const userAgent = navigator.userAgent;
        if (/tablet|ipad|playbook|silk/i.test(userAgent)) return 'tablet';
        if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) return 'mobile';
        return 'desktop';
    }

    getBrowserName() {
        const userAgent = navigator.userAgent;
        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Edge';
        if (userAgent.includes('Opera')) return 'Opera';
        return 'Unknown';
    }

    getOSName() {
        const userAgent = navigator.userAgent;
        if (userAgent.includes('Windows')) return 'Windows';
        if (userAgent.includes('Mac')) return 'macOS';
        if (userAgent.includes('Linux')) return 'Linux';
        if (userAgent.includes('Android')) return 'Android';
        if (userAgent.includes('iOS')) return 'iOS';
        return 'Unknown';
    }

    getSessionId() {
        let sessionId = sessionStorage.getItem('analytics_session_id');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('analytics_session_id', sessionId);
        }
        return sessionId;
    }

    /**
     * Geographic data (placeholder - would integrate with IP geolocation service)
     */
    async getGeographicData() {
        // This would typically call an IP geolocation service
        // For now, return null - implement based on your geolocation provider
        return null;
    }

    /**
     * Data processing helper methods
     */
    aggregateEventsByPeriod(events, periodType) {
        const periods = {};
        
        events.forEach(event => {
            const date = new Date(event.created_at);
            let periodKey;
            
            switch (periodType) {
                case 'daily':
                    periodKey = date.toISOString().split('T')[0];
                    break;
                case 'weekly':
                    const weekStart = new Date(date);
                    weekStart.setDate(date.getDate() - date.getDay());
                    periodKey = weekStart.toISOString().split('T')[0];
                    break;
                case 'monthly':
                    periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    break;
                default:
                    periodKey = date.toISOString().split('T')[0];
            }
            
            if (!periods[periodKey]) {
                periods[periodKey] = {
                    period: periodKey,
                    events: [],
                    uniqueUsers: new Set(),
                    totalViews: 0
                };
            }
            
            periods[periodKey].events.push(event);
            periods[periodKey].uniqueUsers.add(event.user_id || event.anonymous_id);
            periods[periodKey].totalViews++;
        });
        
        return Object.values(periods).map(period => ({
            ...period,
            uniqueUsers: period.uniqueUsers.size
        }));
    }

    calculateAverageTimeOnContent(events) {
        const timeEvents = events.filter(e => e.time_on_page > 0);
        if (timeEvents.length === 0) return 0;
        return timeEvents.reduce((sum, e) => sum + e.time_on_page, 0) / timeEvents.length;
    }

    calculateBounceRate(events) {
        const sessions = {};
        events.forEach(event => {
            const sessionId = event.session_id;
            if (!sessions[sessionId]) sessions[sessionId] = 0;
            sessions[sessionId]++;
        });
        
        const sessionCounts = Object.values(sessions);
        const bouncedSessions = sessionCounts.filter(count => count === 1).length;
        return sessionCounts.length > 0 ? (bouncedSessions / sessionCounts.length) * 100 : 0;
    }

    calculateConversionRate(events) {
        const totalEvents = events.length;
        const conversionEvents = events.filter(e => e.event_category === 'conversion').length;
        return totalEvents > 0 ? (conversionEvents / totalEvents) * 100 : 0;
    }

    getTopCountries(events) {
        const countries = {};
        events.forEach(event => {
            if (event.country_code) {
                countries[event.country_code] = (countries[event.country_code] || 0) + 1;
            }
        });
        
        return Object.entries(countries)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([country, count]) => ({ country, count }));
    }

    getDeviceBreakdown(events) {
        const devices = { desktop: 0, mobile: 0, tablet: 0, unknown: 0 };
        events.forEach(event => {
            const deviceType = event.device_type || 'unknown';
            devices[deviceType] = (devices[deviceType] || 0) + 1;
        });
        return devices;
    }

    getTrafficSources(events) {
        const sources = { organic: 0, direct: 0, referral: 0, social: 0, email: 0, paid: 0 };
        
        events.forEach(event => {
            const referrer = event.referrer_url;
            if (!referrer || referrer === '') {
                sources.direct++;
            } else if (this.isSocialReferrer(referrer)) {
                sources.social++;
            } else if (this.isSearchEngine(referrer)) {
                sources.organic++;
            } else {
                sources.referral++;
            }
        });
        
        return sources;
    }

    isSocialReferrer(referrer) {
        const socialDomains = ['facebook.com', 'twitter.com', 'linkedin.com', 'instagram.com', 'youtube.com'];
        return socialDomains.some(domain => referrer.includes(domain));
    }

    isSearchEngine(referrer) {
        const searchEngines = ['google.com', 'bing.com', 'yahoo.com', 'duckduckgo.com'];
        return searchEngines.some(engine => referrer.includes(engine));
    }

    calculatePerformanceMetrics(events) {
        const loadTimes = events.filter(e => e.page_load_time > 0).map(e => e.page_load_time);
        if (loadTimes.length === 0) return { avgLoadTime: 0, medianLoadTime: 0 };
        
        const avg = loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length;
        const sorted = loadTimes.sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        
        return { avgLoadTime: avg, medianLoadTime: median };
    }

    generateReportId() {
        return 'report_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Cleanup method
     */
    destroy() {
        if (this.performanceObserver) {
            this.performanceObserver.disconnect();
        }
        
        // Flush any remaining events
        if (this.eventQueue.length > 0) {
            this.flushEventQueue().catch(console.error);
        }
        
        this.cache.clear();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnalyticsService;
} else if (typeof window !== 'undefined') {
    window.AnalyticsService = AnalyticsService;
}
 
   /**
     * Additional Helper Methods for Performance Insights and Recommendations
     */

    /**
     * Calculate performance score for content
     * @param {Object} analytics - Analytics data
     */
    calculatePerformanceScore(analytics) {
        let score = 0;
        const weights = {
            views: 0.3,
            engagement: 0.25,
            conversion: 0.25,
            performance: 0.2
        };

        // Views score (normalized to 0-100)
        const viewsScore = Math.min((analytics.totalViews / 1000) * 100, 100);
        score += viewsScore * weights.views;

        // Engagement score
        const engagementScore = Math.min(analytics.avgTimeOnContent / 60 * 20, 100); // 3 minutes = 100%
        score += engagementScore * weights.engagement;

        // Conversion score
        const conversionScore = analytics.conversionRate * 10; // 10% conversion = 100%
        score += Math.min(conversionScore, 100) * weights.conversion;

        // Performance score (inverse of bounce rate)
        const performanceScore = Math.max(100 - analytics.bounceRate, 0);
        score += performanceScore * weights.performance;

        return Math.round(score);
    }

    /**
     * Calculate trend for content over time
     * @param {string} contentType - Content type
     * @param {string} contentId - Content ID
     * @param {number} days - Number of days
     */
    async calculateTrend(contentType, contentId, days) {
        try {
            const endDate = new Date();
            const midDate = new Date(endDate.getTime() - (days / 2 * 24 * 60 * 60 * 1000));
            const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

            const [firstHalf, secondHalf] = await Promise.all([
                this.aggregateContentAnalytics(contentType, contentId, startDate, midDate),
                this.aggregateContentAnalytics(contentType, contentId, midDate, endDate)
            ]);

            const firstHalfViews = firstHalf.totalViews;
            const secondHalfViews = secondHalf.totalViews;

            if (firstHalfViews === 0) return secondHalfViews > 0 ? 'up' : 'stable';
            
            const changePercent = ((secondHalfViews - firstHalfViews) / firstHalfViews) * 100;
            
            if (changePercent > 10) return 'up';
            if (changePercent < -10) return 'down';
            return 'stable';
        } catch (error) {
            console.error('Error calculating trend:', error);
            return 'unknown';
        }
    }

    /**
     * Get content ranking among similar content
     * @param {string} contentType - Content type
     * @param {string} contentId - Content ID
     */
    async getContentRanking(contentType, contentId) {
        try {
            const endDate = new Date();
            const startDate = new Date(endDate.getTime() - (30 * 24 * 60 * 60 * 1000));

            // Get analytics for all content of the same type
            const { data: allContent, error } = await this.supabase
                .from('content_analytics')
                .select('content_id, total_views')
                .eq('content_type', contentType)
                .gte('date_period', startDate.toISOString().split('T')[0])
                .lte('date_period', endDate.toISOString().split('T')[0]);

            if (error) throw error;

            // Aggregate views by content
            const contentViews = {};
            allContent.forEach(item => {
                contentViews[item.content_id] = (contentViews[item.content_id] || 0) + item.total_views;
            });

            // Sort by views and find ranking
            const sortedContent = Object.entries(contentViews)
                .sort(([,a], [,b]) => b - a);

            const ranking = sortedContent.findIndex(([id]) => id === contentId) + 1;
            const totalContent = sortedContent.length;

            return {
                rank: ranking,
                totalContent,
                percentile: totalContent > 0 ? Math.round((1 - (ranking - 1) / totalContent) * 100) : 0
            };
        } catch (error) {
            console.error('Error getting content ranking:', error);
            return { rank: 0, totalContent: 0, percentile: 0 };
        }
    }

    /**
     * Generate recommendations based on analytics
     * @param {Object} analytics - Analytics data
     */
    async generateRecommendations(analytics) {
        const recommendations = [];

        // High bounce rate recommendation
        if (analytics.bounceRate > 70) {
            recommendations.push({
                type: 'engagement',
                priority: 'high',
                title: 'Reduce Bounce Rate',
                description: 'Your content has a high bounce rate. Consider improving the introduction or adding more engaging elements.',
                action: 'Review content structure and add interactive elements'
            });
        }

        // Low conversion rate recommendation
        if (analytics.conversionRate < 2) {
            recommendations.push({
                type: 'conversion',
                priority: 'medium',
                title: 'Improve Conversion Rate',
                description: 'Add clear call-to-action buttons and optimize the user journey.',
                action: 'Add prominent CTAs and reduce friction in conversion flow'
            });
        }

        // Mobile optimization recommendation
        const mobileViews = analytics.deviceBreakdown.mobile || 0;
        const totalViews = analytics.totalViews;
        if (mobileViews / totalViews > 0.5 && analytics.performanceMetrics.avgLoadTime > 3000) {
            recommendations.push({
                type: 'performance',
                priority: 'high',
                title: 'Optimize for Mobile',
                description: 'Most of your traffic is mobile, but load times are slow. Optimize images and reduce page weight.',
                action: 'Compress images and implement lazy loading'
            });
        }

        // Content freshness recommendation
        const daysSinceUpdate = this.calculateDaysSinceUpdate(analytics.contentId);
        if (daysSinceUpdate > 90) {
            recommendations.push({
                type: 'content',
                priority: 'low',
                title: 'Update Content',
                description: 'This content hasn\'t been updated in a while. Fresh content tends to perform better.',
                action: 'Review and update content with current information'
            });
        }

        return recommendations;
    }

    /**
     * Get benchmark comparisons
     * @param {string} contentType - Content type
     * @param {Object} analytics - Analytics data
     */
    async getBenchmarkComparisons(contentType, analytics) {
        try {
            // Get industry benchmarks (this would typically come from a benchmarks database)
            const benchmarks = await this.getIndustryBenchmarks(contentType);
            
            return {
                bounceRate: {
                    value: analytics.bounceRate,
                    benchmark: benchmarks.bounceRate,
                    performance: analytics.bounceRate < benchmarks.bounceRate ? 'above' : 'below'
                },
                avgTimeOnContent: {
                    value: analytics.avgTimeOnContent,
                    benchmark: benchmarks.avgTimeOnContent,
                    performance: analytics.avgTimeOnContent > benchmarks.avgTimeOnContent ? 'above' : 'below'
                },
                conversionRate: {
                    value: analytics.conversionRate,
                    benchmark: benchmarks.conversionRate,
                    performance: analytics.conversionRate > benchmarks.conversionRate ? 'above' : 'below'
                }
            };
        } catch (error) {
            console.error('Error getting benchmark comparisons:', error);
            return {};
        }
    }

    /**
     * Identify optimization opportunities
     * @param {Object} analytics - Analytics data
     */
    identifyOptimizationOpportunities(analytics) {
        const opportunities = [];

        // Traffic source optimization
        const trafficSources = analytics.trafficSources;
        const totalTraffic = Object.values(trafficSources).reduce((sum, val) => sum + val, 0);
        
        if (trafficSources.organic / totalTraffic < 0.3) {
            opportunities.push({
                type: 'seo',
                impact: 'high',
                effort: 'medium',
                title: 'Improve SEO',
                description: 'Organic traffic is low. Optimize for search engines to increase visibility.',
                potentialGain: '25-50% increase in organic traffic'
            });
        }

        if (trafficSources.social / totalTraffic < 0.1) {
            opportunities.push({
                type: 'social',
                impact: 'medium',
                effort: 'low',
                title: 'Increase Social Sharing',
                description: 'Add social sharing buttons and create shareable content.',
                potentialGain: '15-30% increase in social traffic'
            });
        }

        // Device optimization
        const deviceBreakdown = analytics.deviceBreakdown;
        const mobilePercentage = deviceBreakdown.mobile / analytics.totalViews;
        
        if (mobilePercentage > 0.6 && analytics.performanceMetrics.avgLoadTime > 2000) {
            opportunities.push({
                type: 'mobile',
                impact: 'high',
                effort: 'high',
                title: 'Mobile Performance',
                description: 'Optimize for mobile users who make up the majority of your traffic.',
                potentialGain: '20-40% improvement in mobile engagement'
            });
        }

        return opportunities;
    }

    /**
     * System-wide analytics helper methods
     */

    async getTotalEvents(startDate, endDate) {
        const { count, error } = await this.supabase
            .from('analytics_events')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());

        if (error) throw error;
        return count || 0;
    }

    async getUniqueUsers(startDate, endDate) {
        const { data, error } = await this.supabase
            .from('analytics_events')
            .select('user_id, anonymous_id')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());

        if (error) throw error;
        
        const uniqueUsers = new Set();
        data.forEach(event => {
            if (event.user_id) uniqueUsers.add(event.user_id);
            else if (event.anonymous_id) uniqueUsers.add(event.anonymous_id);
        });

        return uniqueUsers.size;
    }

    async getTopPerformingContent(startDate, endDate, limit = 10) {
        const { data, error } = await this.supabase
            .from('content_analytics')
            .select('content_type, content_id, content_title, total_views, unique_views, conversion_rate')
            .gte('date_period', startDate.toISOString().split('T')[0])
            .lte('date_period', endDate.toISOString().split('T')[0])
            .order('total_views', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    }

    async getSystemPerformanceMetrics(startDate, endDate) {
        const { data, error } = await this.supabase
            .from('performance_analytics')
            .select('metric_name, avg_value, p95_value')
            .gte('date_period', startDate.toISOString().split('T')[0])
            .lte('date_period', endDate.toISOString().split('T')[0])
            .in('metric_name', ['page_load_time', 'api_response_time', 'database_query_time']);

        if (error) throw error;

        const metrics = {};
        data.forEach(metric => {
            metrics[metric.metric_name] = {
                average: metric.avg_value,
                p95: metric.p95_value
            };
        });

        return metrics;
    }

    async getErrorRates(startDate, endDate) {
        const [totalEvents, errorEvents] = await Promise.all([
            this.getTotalEvents(startDate, endDate),
            this.supabase
                .from('analytics_events')
                .select('*', { count: 'exact', head: true })
                .eq('event_category', 'error')
                .gte('created_at', startDate.toISOString())
                .lte('created_at', endDate.toISOString())
        ]);

        const errorCount = errorEvents.count || 0;
        return totalEvents > 0 ? (errorCount / totalEvents) * 100 : 0;
    }

    calculateSystemHealthScore(metrics) {
        let score = 100;

        // Deduct points for high error rates
        if (metrics.errorRates > 5) score -= 30;
        else if (metrics.errorRates > 2) score -= 15;
        else if (metrics.errorRates > 1) score -= 5;

        // Deduct points for poor performance
        const avgLoadTime = metrics.performanceMetrics.page_load_time?.average || 0;
        if (avgLoadTime > 5000) score -= 25;
        else if (avgLoadTime > 3000) score -= 15;
        else if (avgLoadTime > 2000) score -= 5;

        // Bonus points for high activity
        if (metrics.totalEvents > 10000) score += 5;
        if (metrics.uniqueUsers > 1000) score += 5;

        return Math.max(0, Math.min(100, score));
    }

    getSystemHealthStatus(errorRates, performanceMetrics) {
        if (errorRates > 5 || (performanceMetrics.page_load_time?.average || 0) > 5000) {
            return 'critical';
        }
        if (errorRates > 2 || (performanceMetrics.page_load_time?.average || 0) > 3000) {
            return 'warning';
        }
        return 'healthy';
    }

    async calculateGrowthRate(startDate, endDate) {
        const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        const midDate = new Date(startDate.getTime() + (totalDays / 2 * 24 * 60 * 60 * 1000));

        const [firstHalfEvents, secondHalfEvents] = await Promise.all([
            this.getTotalEvents(startDate, midDate),
            this.getTotalEvents(midDate, endDate)
        ]);

        if (firstHalfEvents === 0) return secondHalfEvents > 0 ? 100 : 0;
        return ((secondHalfEvents - firstHalfEvents) / firstHalfEvents) * 100;
    }

    generateSystemRecommendations(metrics) {
        const recommendations = [];

        if (metrics.errorRates > 2) {
            recommendations.push({
                type: 'reliability',
                priority: 'high',
                title: 'Reduce Error Rate',
                description: 'System error rate is above acceptable threshold.',
                action: 'Investigate and fix recurring errors'
            });
        }

        if (metrics.performanceMetrics.page_load_time?.average > 3000) {
            recommendations.push({
                type: 'performance',
                priority: 'high',
                title: 'Improve Performance',
                description: 'Page load times are slower than optimal.',
                action: 'Optimize database queries and implement caching'
            });
        }

        if (metrics.uniqueUsers < 100) {
            recommendations.push({
                type: 'growth',
                priority: 'medium',
                title: 'Increase User Acquisition',
                description: 'User base is small. Focus on marketing and user acquisition.',
                action: 'Implement SEO improvements and marketing campaigns'
            });
        }

        return recommendations;
    }

    /**
     * Custom report helper methods
     */

    buildCustomQuery(reportConfig) {
        const { dateRange, filters, metrics, dimensions } = reportConfig;
        
        let query = this.supabase.from('analytics_events').select('*');
        
        // Apply date range
        if (dateRange.startDate) {
            query = query.gte('created_at', dateRange.startDate.toISOString());
        }
        if (dateRange.endDate) {
            query = query.lte('created_at', dateRange.endDate.toISOString());
        }
        
        // Apply filters
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (Array.isArray(value)) {
                    query = query.in(key, value);
                } else {
                    query = query.eq(key, value);
                }
            });
        }
        
        return query;
    }

    async executeCustomQuery(queryBuilder) {
        const { data, error } = await queryBuilder;
        if (error) throw error;
        return data;
    }

    processReportData(data, reportConfig) {
        const { metrics, dimensions, aggregation } = reportConfig;
        
        if (!dimensions || dimensions.length === 0) {
            return data;
        }
        
        // Group data by dimensions
        const grouped = {};
        data.forEach(row => {
            const key = dimensions.map(dim => row[dim]).join('|');
            if (!grouped[key]) {
                grouped[key] = [];
            }
            grouped[key].push(row);
        });
        
        // Aggregate metrics
        return Object.entries(grouped).map(([key, rows]) => {
            const dimensionValues = key.split('|');
            const result = {};
            
            dimensions.forEach((dim, index) => {
                result[dim] = dimensionValues[index];
            });
            
            if (metrics) {
                metrics.forEach(metric => {
                    switch (aggregation || 'sum') {
                        case 'sum':
                            result[metric] = rows.reduce((sum, row) => sum + (row[metric] || 0), 0);
                            break;
                        case 'avg':
                            result[metric] = rows.reduce((sum, row) => sum + (row[metric] || 0), 0) / rows.length;
                            break;
                        case 'count':
                            result[metric] = rows.length;
                            break;
                        case 'unique':
                            result[metric] = new Set(rows.map(row => row[metric])).size;
                            break;
                    }
                });
            }
            
            return result;
        });
    }

    async generateVisualizations(data, visualizationConfig) {
        // This would integrate with a charting library like Chart.js or D3.js
        // For now, return configuration for charts
        return {
            charts: visualizationConfig.charts?.map(chart => ({
                type: chart.type,
                data: this.prepareChartData(data, chart),
                options: chart.options
            })) || []
        };
    }

    prepareChartData(data, chartConfig) {
        const { xAxis, yAxis, groupBy } = chartConfig;
        
        if (groupBy) {
            const grouped = {};
            data.forEach(row => {
                const group = row[groupBy];
                if (!grouped[group]) grouped[group] = [];
                grouped[group].push(row);
            });
            
            return {
                labels: Object.keys(grouped),
                datasets: Object.entries(grouped).map(([label, rows]) => ({
                    label,
                    data: rows.map(row => ({ x: row[xAxis], y: row[yAxis] }))
                }))
            };
        }
        
        return {
            labels: data.map(row => row[xAxis]),
            datasets: [{
                data: data.map(row => row[yAxis])
            }]
        };
    }

    generateReportSummary(data) {
        if (!data || data.length === 0) {
            return { totalRecords: 0, summary: 'No data available for the selected criteria.' };
        }
        
        const numericFields = Object.keys(data[0]).filter(key => 
            typeof data[0][key] === 'number'
        );
        
        const summary = {
            totalRecords: data.length,
            numericSummary: {}
        };
        
        numericFields.forEach(field => {
            const values = data.map(row => row[field]).filter(val => val != null);
            if (values.length > 0) {
                summary.numericSummary[field] = {
                    sum: values.reduce((sum, val) => sum + val, 0),
                    avg: values.reduce((sum, val) => sum + val, 0) / values.length,
                    min: Math.min(...values),
                    max: Math.max(...values)
                };
            }
        });
        
        return summary;
    }

    formatReportOutput(report, format) {
        switch (format.toLowerCase()) {
            case 'csv':
                return this.convertToCSV(report.data);
            case 'json':
                return JSON.stringify(report, null, 2);
            case 'xlsx':
                // Would integrate with a library like SheetJS
                return { error: 'XLSX format not implemented yet' };
            default:
                return report;
        }
    }

    convertToCSV(data) {
        if (!data || data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];
        
        data.forEach(row => {
            const values = headers.map(header => {
                const value = row[header];
                return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
            });
            csvRows.push(values.join(','));
        });
        
        return csvRows.join('\n');
    }

    /**
     * Funnel analysis helper methods
     */

    async getFunnelStepData(step, startDate, endDate, filters) {
        const query = this.supabase
            .from('analytics_events')
            .select('user_id, anonymous_id, created_at, event_value')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());
        
        // Apply step-specific filters
        if (step.eventType) query.eq('event_type', step.eventType);
        if (step.eventAction) query.eq('event_action', step.eventAction);
        if (step.eventCategory) query.eq('event_category', step.eventCategory);
        
        const { data, error } = await query;
        if (error) throw error;
        
        const uniqueUsers = new Set();
        let totalValue = 0;
        const completionTimes = [];
        
        data.forEach(event => {
            const userId = event.user_id || event.anonymous_id;
            uniqueUsers.add(userId);
            totalValue += event.event_value || 0;
            
            // Calculate time to complete (simplified)
            if (event.created_at) {
                const eventTime = new Date(event.created_at);
                const sessionStart = new Date(startDate);
                completionTimes.push((eventTime - sessionStart) / 1000);
            }
        });
        
        return {
            usersEntered: uniqueUsers.size,
            usersCompleted: uniqueUsers.size, // Simplified - would need more complex logic
            avgTimeToComplete: completionTimes.length > 0 ? 
                completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length : 0,
            conversionValue: totalValue
        };
    }

    calculateOverallConversionRate(funnelData) {
        if (funnelData.length === 0) return 0;
        
        const firstStep = funnelData[0];
        const lastStep = funnelData[funnelData.length - 1];
        
        return firstStep.usersEntered > 0 ? 
            (lastStep.usersCompleted / firstStep.usersEntered) * 100 : 0;
    }

    generateFunnelInsights(funnelData) {
        const insights = [];
        
        for (let i = 1; i < funnelData.length; i++) {
            const currentStep = funnelData[i];
            const previousStep = funnelData[i - 1];
            
            const dropOffRate = previousStep.usersEntered > 0 ? 
                ((previousStep.usersEntered - currentStep.usersEntered) / previousStep.usersEntered) * 100 : 0;
            
            if (dropOffRate > 50) {
                insights.push({
                    type: 'high_dropoff',
                    step: currentStep.stepName,
                    message: `High drop-off rate (${dropOffRate.toFixed(1)}%) between ${previousStep.stepName} and ${currentStep.stepName}`,
                    recommendation: 'Investigate user experience issues at this step'
                });
            }
        }
        
        return insights;
    }

    /**
     * Additional utility methods
     */

    async getIndustryBenchmarks(contentType) {
        // This would typically fetch from a benchmarks database
        // For now, return default benchmarks
        return {
            bounceRate: 60, // 60% average bounce rate
            avgTimeOnContent: 120, // 2 minutes average time
            conversionRate: 2.5 // 2.5% average conversion rate
        };
    }

    calculateDaysSinceUpdate(contentId) {
        // This would query the content table for last update
        // For now, return a placeholder
        return 30;
    }

    async aggregatePerformanceMetric(metricData) {
        try {
            const { data, error } = await this.supabase
                .from('performance_analytics')
                .upsert({
                    metric_name: metricData.metricName,
                    metric_category: metricData.metricCategory,
                    date_period: metricData.datePeriod,
                    period_type: metricData.periodType,
                    avg_value: metricData.avgValue,
                    min_value: metricData.minValue,
                    max_value: metricData.maxValue,
                    median_value: metricData.medianValue,
                    sample_count: metricData.sampleCount,
                    page_path: metricData.pageUrl
                }, {
                    onConflict: 'metric_name,metric_category,date_period,period_type,page_path'
                });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error aggregating performance metric:', error);
        }
    }

    getPrimaryDevice(sessions) {
        const deviceCounts = {};
        sessions.forEach(session => {
            const device = session.device_type || 'unknown';
            deviceCounts[device] = (deviceCounts[device] || 0) + 1;
        });
        
        return Object.entries(deviceCounts)
            .sort(([,a], [,b]) => b - a)[0]?.[0] || 'unknown';
    }
}
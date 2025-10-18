/**
 * Server-side Analytics Service for CMS Enhancement System
 * 
 * This is the Node.js compatible version of the AnalyticsService
 * Optimized for server-side operations and API endpoints
 */

class AnalyticsServiceServer {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.eventQueue = [];
        this.batchSize = 100; // Larger batch size for server
        this.flushInterval = 10000; // 10 seconds
        this.isProcessing = false;
        
        // Start batch processing
        this.startBatchProcessing();
        
        // Cache for frequently accessed data
        this.cache = new Map();
        this.cacheTimeout = 300000; // 5 minutes
    }

    /**
     * Track a single event
     */
    async trackEvent(eventData, immediate = false) {
        try {
            const enrichedEvent = this.enrichEventData(eventData);
            
            if (immediate) {
                return await this.sendEvent(enrichedEvent);
            } else {
                this.eventQueue.push(enrichedEvent);
                
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
     * Enrich event data with server-side context
     */
    enrichEventData(eventData) {
        return {
            ...eventData,
            created_at: eventData.created_at || new Date().toISOString(),
            server_processed: true,
            processing_timestamp: new Date().toISOString()
        };
    }

    /**
     * Send event to database
     */
    async sendEvent(eventData) {
        try {
            const { data, error } = await this.supabase
                .from('analytics_events')
                .insert([eventData])
                .select();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error sending event:', error);
            throw error;
        }
    }

    /**
     * Flush event queue
     */
    async flushEventQueue() {
        if (this.isProcessing || this.eventQueue.length === 0) return;

        this.isProcessing = true;
        const eventsToProcess = [...this.eventQueue];
        this.eventQueue = [];

        try {
            const { data, error } = await this.supabase
                .from('analytics_events')
                .insert(eventsToProcess)
                .select();

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
     * Aggregate content analytics
     */
    async aggregateContentAnalytics(contentType, contentId, startDate, endDate, periodType = 'daily') {
        try {
            const cacheKey = `content_analytics_${contentType}_${contentId}_${periodType}_${startDate}_${endDate}`;
            const cached = this.getFromCache(cacheKey);
            if (cached) return cached;

            // Get raw analytics events
            let query = this.supabase
                .from('analytics_events')
                .select('*')
                .eq('event_category', 'content')
                .gte('created_at', startDate.toISOString())
                .lte('created_at', endDate.toISOString());

            if (contentType === 'case_study') {
                query = query.eq('case_study_id', contentId);
            } else if (contentType === 'template') {
                query = query.eq('template_id', contentId);
            }

            const { data: events, error } = await query;
            if (error) throw error;

            // Aggregate data by period
            const aggregatedData = this.aggregateEventsByPeriod(events, periodType);

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
     */
    async aggregateUserBehaviorAnalytics(userId, startDate, endDate, periodType = 'daily') {
        try {
            const cacheKey = `user_behavior_${userId}_${periodType}_${startDate}_${endDate}`;
            const cached = this.getFromCache(cacheKey);
            if (cached) return cached;

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
     * Generate content insights
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
     * Generate system insights
     */
    async generateSystemInsights(days = 30) {
        try {
            const endDate = new Date();
            const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

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
     * Generate custom report
     */
    async generateCustomReport(reportConfig) {
        try {
            const reportStartTime = Date.now();
            
            const queryBuilder = this.buildCustomQuery(reportConfig);
            const data = await this.executeCustomQuery(queryBuilder);
            const processedData = this.processReportData(data, reportConfig);

            const visualizations = reportConfig.visualization ? 
                await this.generateVisualizations(processedData, reportConfig.visualization) : null;

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
                    dateRange: reportConfig.dateRange,
                    filters: reportConfig.filters,
                    executionTime: Date.now() - reportStartTime
                }
            };

            return this.formatReportOutput(report, reportConfig.format || 'json');
        } catch (error) {
            console.error('Error generating custom report:', error);
            throw error;
        }
    }

    /**
     * Generate funnel report
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

    // System metrics methods
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

    // Helper methods (simplified versions of client-side methods)
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

    calculatePerformanceMetrics(events) {
        const loadTimes = events.filter(e => e.page_load_time > 0).map(e => e.page_load_time);
        if (loadTimes.length === 0) return { avgLoadTime: 0, medianLoadTime: 0 };
        
        const avg = loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length;
        const sorted = loadTimes.sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        
        return { avgLoadTime: avg, medianLoadTime: median };
    }

    // Cache management
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

    // Utility methods
    isSocialReferrer(referrer) {
        const socialDomains = ['facebook.com', 'twitter.com', 'linkedin.com', 'instagram.com', 'youtube.com'];
        return socialDomains.some(domain => referrer.includes(domain));
    }

    isSearchEngine(referrer) {
        const searchEngines = ['google.com', 'bing.com', 'yahoo.com', 'duckduckgo.com'];
        return searchEngines.some(engine => referrer.includes(engine));
    }

    generateReportId() {
        return 'report_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Placeholder methods for complex calculations (implement as needed)
    calculatePerformanceScore(analytics) {
        // Simplified scoring algorithm
        let score = 50; // Base score
        
        if (analytics.totalViews > 100) score += 20;
        if (analytics.bounceRate < 50) score += 15;
        if (analytics.conversionRate > 2) score += 15;
        
        return Math.min(100, Math.max(0, score));
    }

    async calculateTrend(contentType, contentId, days) {
        // Simplified trend calculation
        return 'stable';
    }

    async getContentRanking(contentType, contentId) {
        // Simplified ranking
        return { rank: 1, totalContent: 1, percentile: 100 };
    }

    async generateRecommendations(analytics) {
        const recommendations = [];
        
        if (analytics.bounceRate > 70) {
            recommendations.push({
                type: 'engagement',
                priority: 'high',
                title: 'Reduce Bounce Rate',
                description: 'High bounce rate detected. Consider improving content engagement.',
                action: 'Review content structure and add interactive elements'
            });
        }
        
        return recommendations;
    }

    async getBenchmarkComparisons(contentType, analytics) {
        return {
            bounceRate: { value: analytics.bounceRate, benchmark: 60, performance: 'below' },
            conversionRate: { value: analytics.conversionRate, benchmark: 2.5, performance: 'above' }
        };
    }

    identifyOptimizationOpportunities(analytics) {
        return [];
    }

    calculateSystemHealthScore(metrics) {
        let score = 100;
        if (metrics.errorRates > 5) score -= 30;
        if (metrics.totalEvents < 100) score -= 20;
        return Math.max(0, score);
    }

    getSystemHealthStatus(errorRates, performanceMetrics) {
        if (errorRates > 5) return 'critical';
        if (errorRates > 2) return 'warning';
        return 'healthy';
    }

    async calculateGrowthRate(startDate, endDate) {
        return 5.2; // Placeholder
    }

    generateSystemRecommendations(metrics) {
        return [];
    }

    buildCustomQuery(reportConfig) {
        const { dateRange, filters } = reportConfig;
        
        let query = this.supabase.from('analytics_events').select('*');
        
        if (dateRange.startDate) {
            query = query.gte('created_at', dateRange.startDate.toISOString());
        }
        if (dateRange.endDate) {
            query = query.lte('created_at', dateRange.endDate.toISOString());
        }
        
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
        return data; // Simplified processing
    }

    async generateVisualizations(data, visualizationConfig) {
        return { charts: [] }; // Placeholder
    }

    generateReportSummary(data) {
        return {
            totalRecords: data.length,
            summary: `Report contains ${data.length} records`
        };
    }

    formatReportOutput(report, format) {
        switch (format.toLowerCase()) {
            case 'csv':
                return this.convertToCSV(report.data);
            case 'json':
                return report;
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

    async getFunnelStepData(step, startDate, endDate, filters) {
        // Simplified funnel step data
        return {
            usersEntered: 100,
            usersCompleted: 80,
            avgTimeToComplete: 120,
            conversionValue: 0
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
        return [];
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

    /**
     * Cleanup method
     */
    destroy() {
        // Flush any remaining events
        if (this.eventQueue.length > 0) {
            this.flushEventQueue().catch(console.error);
        }
        
        this.cache.clear();
    }
}

module.exports = AnalyticsServiceServer;
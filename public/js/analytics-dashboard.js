/**
 * Analytics Dashboard JavaScript
 * CMS Enhancement System
 * 
 * This script manages the analytics dashboard UI, data visualization,
 * and real-time analytics updates for the CMS Enhancement system.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10
 */

class AnalyticsDashboard {
    constructor() {
        this.analyticsService = null;
        this.charts = {};
        this.currentTab = 'overview';
        this.refreshInterval = null;
        this.autoRefresh = false;
        this.dateRange = 30; // Default to 30 days
        this.apiBaseUrl = 'http://localhost:3000';
        this.authToken = null;
        
        // Initialize dashboard
        this.init();
    }

    /**
     * Initialize the dashboard
     */
    async init() {
        try {
            // Show loading overlay
            this.showLoading();
            
            // Initialize authentication
            await this.initializeAuth();
            
            // Initialize analytics service
            this.initializeAnalyticsService();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load initial data
            await this.loadDashboardData();
            
            // Hide loading overlay
            this.hideLoading();
            
            console.log('Analytics Dashboard initialized successfully');
        } catch (error) {
            console.error('Failed to initialize dashboard:', error);
            this.showError('Failed to initialize dashboard: ' + error.message);
        }
    }

    /**
     * Initialize authentication
     */
    async initializeAuth() {
        // Get auth token from localStorage or prompt user
        this.authToken = localStorage.getItem('analytics_auth_token');
        
        if (!this.authToken) {
            // For demo purposes, use a test token
            this.authToken = 'demo-token-' + Date.now();
            localStorage.setItem('analytics_auth_token', this.authToken);
        }
        
        // Update user info display
        document.getElementById('userInfo').textContent = 'Analytics User';
    }

    /**
     * Initialize analytics service
     */
    initializeAnalyticsService() {
        if (typeof AnalyticsService !== 'undefined' && typeof supabaseClient !== 'undefined') {
            this.analyticsService = new AnalyticsService(supabaseClient);
        } else {
            console.warn('AnalyticsService or Supabase client not available');
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Date range selector
        document.getElementById('dateRange').addEventListener('change', (e) => {
            this.dateRange = parseInt(e.target.value);
            this.refreshDashboard();
        });

        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.refreshDashboard();
        });

        // Auto-refresh toggle
        document.getElementById('autoRefresh').addEventListener('change', (e) => {
            this.autoRefresh = e.target.checked;
            if (this.autoRefresh) {
                this.startAutoRefresh();
            } else {
                this.stopAutoRefresh();
            }
        });

        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.closeModal(e.target.closest('.modal'));
            });
        });

        // Report generation
        document.getElementById('generateReportBtn')?.addEventListener('click', () => {
            this.generateCustomReport();
        });

        // Insights generation
        document.getElementById('generateInsights')?.addEventListener('click', () => {
            this.generateInsights();
        });

        // Funnel analysis
        document.getElementById('analyzeFunnel')?.addEventListener('click', () => {
            this.analyzeFunnel();
        });

        // Chart type changes
        document.getElementById('eventsChartType')?.addEventListener('change', (e) => {
            this.updateChart('eventsChart', e.target.value);
        });

        // Content filters
        document.getElementById('contentType')?.addEventListener('change', () => {
            this.loadContentAnalytics();
        });

        document.getElementById('contentSort')?.addEventListener('change', () => {
            this.loadContentAnalytics();
        });
    }

    /**
     * Switch between dashboard tabs
     */
    switchTab(tabName) {
        // Update active tab
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update active content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');

        this.currentTab = tabName;

        // Load tab-specific data
        this.loadTabData(tabName);
    }

    /**
     * Load data for specific tab
     */
    async loadTabData(tabName) {
        try {
            switch (tabName) {
                case 'overview':
                    await this.loadOverviewData();
                    break;
                case 'content':
                    await this.loadContentAnalytics();
                    break;
                case 'users':
                    await this.loadUserAnalytics();
                    break;
                case 'performance':
                    await this.loadPerformanceAnalytics();
                    break;
                case 'insights':
                    await this.loadInsights();
                    break;
                case 'reports':
                    await this.loadReports();
                    break;
                case 'funnels':
                    await this.loadFunnels();
                    break;
            }
        } catch (error) {
            console.error(`Error loading ${tabName} data:`, error);
            this.showError(`Failed to load ${tabName} data`);
        }
    }

    /**
     * Load dashboard data
     */
    async loadDashboardData() {
        await this.loadOverviewData();
    }

    /**
     * Load overview data
     */
    async loadOverviewData() {
        try {
            // Load dashboard data from API
            const dashboardData = await this.makeApiRequest('GET', '/api/analytics/dashboard', {
                days: this.dateRange
            });

            if (dashboardData.success) {
                this.updateOverviewMetrics(dashboardData.data);
                this.updateOverviewCharts(dashboardData.data);
                this.updateTopContent(dashboardData.data.topContent);
            } else {
                // Use mock data for demo
                this.loadMockOverviewData();
            }
        } catch (error) {
            console.error('Error loading overview data:', error);
            this.loadMockOverviewData();
        }
    }

    /**
     * Load mock overview data for demo
     */
    loadMockOverviewData() {
        const mockData = {
            overview: {
                totalEvents: 15420,
                uniqueUsers: 3240,
                avgEventsPerUser: 4.75,
                systemHealthScore: 92,
                systemStatus: 'healthy'
            },
            topContent: [
                { content_title: 'E-commerce Redesign Case Study', content_type: 'case_study', total_views: 1250, unique_views: 980, conversion_rate: 3.2 },
                { content_title: 'Landing Page Template', content_type: 'template', total_views: 890, unique_views: 720, conversion_rate: 2.8 },
                { content_title: 'Mobile App UX Study', content_type: 'case_study', total_views: 750, unique_views: 620, conversion_rate: 4.1 }
            ]
        };

        this.updateOverviewMetrics(mockData);
        this.updateOverviewCharts(mockData);
        this.updateTopContent(mockData.topContent);
    }

    /**
     * Update overview metrics
     */
    updateOverviewMetrics(data) {
        const overview = data.overview || data;
        
        // Update metric values
        document.getElementById('totalEvents').textContent = this.formatNumber(overview.totalEvents);
        document.getElementById('uniqueUsers').textContent = this.formatNumber(overview.uniqueUsers);
        document.getElementById('avgSessionTime').textContent = this.formatDuration(overview.avgSessionTime || 180);
        document.getElementById('conversionRate').textContent = this.formatPercentage(overview.conversionRate || 2.5);
        document.getElementById('systemHealth').textContent = overview.systemHealthScore + '/100';
        document.getElementById('mobileTraffic').textContent = this.formatPercentage(overview.mobileTraffic || 65);

        // Update metric changes (mock data)
        this.updateMetricChange('eventsChange', 12.5, true);
        this.updateMetricChange('usersChange', 8.3, true);
        this.updateMetricChange('sessionChange', -2.1, false);
        this.updateMetricChange('conversionChange', 5.7, true);
        this.updateMetricChange('mobileChange', 3.2, true);

        // Update system health status
        const healthStatus = document.getElementById('healthStatus');
        healthStatus.textContent = overview.systemStatus || 'healthy';
        healthStatus.className = `metric-status ${overview.systemStatus || 'healthy'}`;
    }

    /**
     * Update metric change indicator
     */
    updateMetricChange(elementId, change, isPositive) {
        const element = document.getElementById(elementId);
        if (element) {
            const sign = isPositive ? '+' : '';
            element.textContent = `${sign}${change}%`;
            element.className = `metric-change ${isPositive ? 'positive' : 'negative'}`;
        }
    }

    /**
     * Update overview charts
     */
    updateOverviewCharts(data) {
        // Generate mock time series data
        const days = this.dateRange;
        const labels = [];
        const eventsData = [];
        const usersData = [];

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString());
            
            // Generate realistic mock data
            eventsData.push(Math.floor(Math.random() * 200) + 300);
            usersData.push(Math.floor(Math.random() * 50) + 80);
        }

        // Events over time chart
        this.createChart('eventsChart', {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Events',
                    data: eventsData,
                    borderColor: '#4299e1',
                    backgroundColor: 'rgba(66, 153, 225, 0.1)',
                    tension: 0.4
                }]
            },
            options: this.getChartOptions('Events Over Time')
        });

        // User engagement chart
        this.createChart('engagementChart', {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Users',
                    data: usersData,
                    borderColor: '#48bb78',
                    backgroundColor: 'rgba(72, 187, 120, 0.1)',
                    tension: 0.4
                }]
            },
            options: this.getChartOptions('User Engagement')
        });

        // Device breakdown chart
        this.createChart('deviceChart', {
            type: 'doughnut',
            data: {
                labels: ['Desktop', 'Mobile', 'Tablet'],
                datasets: [{
                    data: [45, 40, 15],
                    backgroundColor: ['#4299e1', '#48bb78', '#ed8936']
                }]
            },
            options: this.getPieChartOptions('Device Breakdown')
        });

        // Traffic sources chart
        this.createChart('trafficChart', {
            type: 'doughnut',
            data: {
                labels: ['Organic', 'Direct', 'Referral', 'Social'],
                datasets: [{
                    data: [35, 30, 20, 15],
                    backgroundColor: ['#667eea', '#764ba2', '#f093fb', '#f5576c']
                }]
            },
            options: this.getPieChartOptions('Traffic Sources')
        });
    }

    /**
     * Update top content table
     */
    updateTopContent(topContent) {
        const tbody = document.querySelector('#topContentTable tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        topContent.forEach(content => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${content.content_title || content.content_id}</td>
                <td><span class="badge badge-${content.content_type}">${content.content_type}</span></td>
                <td>${this.formatNumber(content.total_views)}</td>
                <td>${this.formatNumber(content.unique_views)}</td>
                <td>${this.formatPercentage(content.conversion_rate)}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="dashboard.viewContentDetails('${content.content_id}')">
                        View Details
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    /**
     * Load content analytics
     */
    async loadContentAnalytics() {
        try {
            // Mock content analytics data
            const contentData = [
                { title: 'E-commerce Redesign', type: 'case_study', views: 1250, avgTime: 245, bounceRate: 35, conversions: 40, score: 85 },
                { title: 'Landing Page Template', type: 'template', views: 890, avgTime: 180, bounceRate: 42, conversions: 25, score: 78 },
                { title: 'Mobile App UX', type: 'case_study', views: 750, avgTime: 320, bounceRate: 28, conversions: 31, score: 82 },
                { title: 'Product Showcase', type: 'template', views: 650, avgTime: 165, bounceRate: 48, conversions: 18, score: 72 }
            ];

            this.updateContentTable(contentData);
            this.updateContentCharts(contentData);
        } catch (error) {
            console.error('Error loading content analytics:', error);
        }
    }

    /**
     * Update content analytics table
     */
    updateContentTable(contentData) {
        const tbody = document.querySelector('#contentAnalyticsTable tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        contentData.forEach(content => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${content.title}</td>
                <td><span class="badge badge-${content.type}">${content.type}</span></td>
                <td>${this.formatNumber(content.views)}</td>
                <td>${this.formatDuration(content.avgTime)}</td>
                <td>${this.formatPercentage(content.bounceRate)}</td>
                <td>${content.conversions}</td>
                <td><span class="score score-${this.getScoreClass(content.score)}">${content.score}</span></td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="dashboard.viewContentInsights('${content.title}')">
                        Insights
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    /**
     * Update content charts
     */
    updateContentCharts(contentData) {
        // Content performance chart
        this.createChart('contentPerformanceChart', {
            type: 'bar',
            data: {
                labels: contentData.map(c => c.title),
                datasets: [{
                    label: 'Performance Score',
                    data: contentData.map(c => c.score),
                    backgroundColor: '#4299e1'
                }]
            },
            options: this.getChartOptions('Content Performance Scores')
        });

        // Content engagement chart
        this.createChart('contentEngagementChart', {
            type: 'line',
            data: {
                labels: contentData.map(c => c.title),
                datasets: [{
                    label: 'Avg Time (seconds)',
                    data: contentData.map(c => c.avgTime),
                    borderColor: '#48bb78',
                    backgroundColor: 'rgba(72, 187, 120, 0.1)',
                    tension: 0.4
                }]
            },
            options: this.getChartOptions('Content Engagement Time')
        });
    }

    /**
     * Load user analytics
     */
    async loadUserAnalytics() {
        // Mock user analytics implementation
        console.log('Loading user analytics...');
        
        // User acquisition chart
        this.createChart('userAcquisitionChart', {
            type: 'line',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                datasets: [{
                    label: 'New Users',
                    data: [120, 150, 180, 200],
                    borderColor: '#4299e1',
                    backgroundColor: 'rgba(66, 153, 225, 0.1)'
                }]
            },
            options: this.getChartOptions('User Acquisition')
        });

        // User retention chart
        this.createChart('userRetentionChart', {
            type: 'bar',
            data: {
                labels: ['Day 1', 'Day 7', 'Day 14', 'Day 30'],
                datasets: [{
                    label: 'Retention Rate (%)',
                    data: [100, 65, 45, 30],
                    backgroundColor: '#48bb78'
                }]
            },
            options: this.getChartOptions('User Retention')
        });
    }

    /**
     * Load performance analytics
     */
    async loadPerformanceAnalytics() {
        // Mock performance data
        const performanceData = {
            avgLoadTime: 1250,
            p95LoadTime: 2100,
            errorRate: 0.5,
            uptime: 99.9
        };

        // Update performance metrics
        document.getElementById('avgLoadTime').textContent = performanceData.avgLoadTime + 'ms';
        document.getElementById('p95LoadTime').textContent = performanceData.p95LoadTime + 'ms';
        document.getElementById('errorRate').textContent = performanceData.errorRate + '%';
        document.getElementById('uptime').textContent = performanceData.uptime + '%';

        // Performance trends chart
        this.createChart('performanceChart', {
            type: 'line',
            data: {
                labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
                datasets: [{
                    label: 'Response Time (ms)',
                    data: [1200, 1100, 1300, 1400, 1250, 1150],
                    borderColor: '#ed8936',
                    backgroundColor: 'rgba(237, 137, 54, 0.1)'
                }]
            },
            options: this.getChartOptions('Performance Trends')
        });

        // Error distribution chart
        this.createChart('errorChart', {
            type: 'doughnut',
            data: {
                labels: ['4xx Errors', '5xx Errors', 'Timeouts', 'Other'],
                datasets: [{
                    data: [60, 25, 10, 5],
                    backgroundColor: ['#f56565', '#ed8936', '#ecc94b', '#9f7aea']
                }]
            },
            options: this.getPieChartOptions('Error Distribution')
        });
    }

    /**
     * Load insights
     */
    async loadInsights() {
        try {
            // Mock insights data
            const insights = {
                high: [
                    {
                        title: 'High Bounce Rate Detected',
                        description: 'Mobile users are experiencing a 75% bounce rate, significantly higher than desktop users.',
                        action: 'Optimize mobile page load times and improve mobile UX design.'
                    }
                ],
                medium: [
                    {
                        title: 'Content Performance Opportunity',
                        description: 'Case studies are performing 40% better than templates in terms of engagement.',
                        action: 'Consider creating more case study content and promoting existing ones.'
                    }
                ],
                low: [
                    {
                        title: 'SEO Optimization Potential',
                        description: 'Organic traffic accounts for only 35% of total traffic.',
                        action: 'Implement SEO best practices and create more search-optimized content.'
                    }
                ]
            };

            this.updateInsights(insights);
        } catch (error) {
            console.error('Error loading insights:', error);
        }
    }

    /**
     * Update insights display
     */
    updateInsights(insights) {
        // High priority insights
        const highPriorityDiv = document.getElementById('highPriorityInsights');
        if (highPriorityDiv) {
            highPriorityDiv.innerHTML = insights.high.map(insight => `
                <div class="insight-item">
                    <h4>${insight.title}</h4>
                    <p>${insight.description}</p>
                    <div class="insight-action">
                        <strong>Recommended Action:</strong> ${insight.action}
                    </div>
                </div>
            `).join('');
        }

        // Medium priority insights
        const mediumPriorityDiv = document.getElementById('mediumPriorityInsights');
        if (mediumPriorityDiv) {
            mediumPriorityDiv.innerHTML = insights.medium.map(insight => `
                <div class="insight-item">
                    <h4>${insight.title}</h4>
                    <p>${insight.description}</p>
                    <div class="insight-action">
                        <strong>Recommended Action:</strong> ${insight.action}
                    </div>
                </div>
            `).join('');
        }

        // Opportunity insights
        const opportunityDiv = document.getElementById('opportunityInsights');
        if (opportunityDiv) {
            opportunityDiv.innerHTML = insights.low.map(insight => `
                <div class="insight-item">
                    <h4>${insight.title}</h4>
                    <p>${insight.description}</p>
                    <div class="insight-action">
                        <strong>Recommended Action:</strong> ${insight.action}
                    </div>
                </div>
            `).join('');
        }

        // Update recommendations list
        const recommendationsList = document.getElementById('recommendationsList');
        if (recommendationsList) {
            const allInsights = [...insights.high, ...insights.medium, ...insights.low];
            recommendationsList.innerHTML = allInsights.map((insight, index) => `
                <div class="recommendation-item">
                    <div class="recommendation-header">
                        <span class="recommendation-number">${index + 1}</span>
                        <span class="recommendation-title">${insight.title}</span>
                    </div>
                    <div class="recommendation-action">${insight.action}</div>
                </div>
            `).join('');
        }
    }

    /**
     * Load reports
     */
    async loadReports() {
        // Mock reports data
        const reports = [
            { id: 1, name: 'Weekly Performance Report', type: 'scheduled', lastRun: '2024-01-15', status: 'completed' },
            { id: 2, name: 'Content Analytics Summary', type: 'manual', lastRun: '2024-01-14', status: 'completed' },
            { id: 3, name: 'User Behavior Analysis', type: 'manual', lastRun: '2024-01-13', status: 'failed' }
        ];

        this.updateReportsList(reports);
    }

    /**
     * Update reports list
     */
    updateReportsList(reports) {
        const reportsList = document.getElementById('savedReportsList');
        if (!reportsList) return;

        reportsList.innerHTML = reports.map(report => `
            <div class="report-item">
                <div class="report-header">
                    <span class="report-name">${report.name}</span>
                    <span class="report-status status-${report.status}">${report.status}</span>
                </div>
                <div class="report-details">
                    <span class="report-type">${report.type}</span>
                    <span class="report-date">Last run: ${report.lastRun}</span>
                </div>
                <div class="report-actions">
                    <button class="btn btn-sm btn-primary" onclick="dashboard.runReport(${report.id})">Run</button>
                    <button class="btn btn-sm btn-secondary" onclick="dashboard.viewReport(${report.id})">View</button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Load funnels
     */
    async loadFunnels() {
        console.log('Loading funnel analysis...');
        // Funnel functionality would be implemented here
    }

    /**
     * Create or update a chart
     */
    createChart(canvasId, config) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        // Destroy existing chart if it exists
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        // Create new chart
        this.charts[canvasId] = new Chart(canvas, config);
    }

    /**
     * Get default chart options
     */
    getChartOptions(title) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: false
                },
                legend: {
                    display: true,
                    position: 'bottom'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#f1f5f9'
                    }
                },
                x: {
                    grid: {
                        color: '#f1f5f9'
                    }
                }
            }
        };
    }

    /**
     * Get pie chart options
     */
    getPieChartOptions(title) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: false
                },
                legend: {
                    display: true,
                    position: 'bottom'
                }
            }
        };
    }

    /**
     * Make API request
     */
    async makeApiRequest(method, endpoint, params = {}) {
        try {
            const url = new URL(this.apiBaseUrl + endpoint);
            
            if (method === 'GET' && Object.keys(params).length > 0) {
                Object.keys(params).forEach(key => {
                    url.searchParams.append(key, params[key]);
                });
            }

            const config = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                }
            };

            if (method !== 'GET' && Object.keys(params).length > 0) {
                config.body = JSON.stringify(params);
            }

            const response = await fetch(url, config);
            const data = await response.json();

            return {
                success: response.ok,
                status: response.status,
                data: data
            };
        } catch (error) {
            console.error('API request failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Utility methods
     */
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    formatPercentage(num) {
        return num.toFixed(1) + '%';
    }

    formatDuration(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    getScoreClass(score) {
        if (score >= 80) return 'high';
        if (score >= 60) return 'medium';
        return 'low';
    }

    /**
     * Dashboard actions
     */
    refreshDashboard() {
        this.showLoading();
        this.loadDashboardData().then(() => {
            this.hideLoading();
        });
    }

    startAutoRefresh() {
        this.refreshInterval = setInterval(() => {
            this.refreshDashboard();
        }, 30000); // Refresh every 30 seconds
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    logout() {
        localStorage.removeItem('analytics_auth_token');
        window.location.href = '/login.html';
    }

    /**
     * Modal management
     */
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
        }
    }

    closeModal(modal) {
        if (modal) {
            modal.classList.remove('active');
        }
    }

    /**
     * Loading and error handling
     */
    showLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('hidden');
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }

    showError(message) {
        console.error(message);
        // You could implement a toast notification system here
        alert('Error: ' + message);
    }

    /**
     * Content-specific actions
     */
    viewContentDetails(contentId) {
        console.log('Viewing content details for:', contentId);
        // Implement content details modal
    }

    viewContentInsights(contentTitle) {
        console.log('Viewing insights for:', contentTitle);
        // Implement content insights modal
    }

    /**
     * Report actions
     */
    generateCustomReport() {
        const reportName = document.getElementById('reportName').value;
        const dateRange = document.getElementById('reportDateRange').value;
        const format = document.getElementById('reportFormat').value;
        
        console.log('Generating report:', { reportName, dateRange, format });
        // Implement report generation
    }

    runReport(reportId) {
        console.log('Running report:', reportId);
        // Implement report execution
    }

    viewReport(reportId) {
        console.log('Viewing report:', reportId);
        // Implement report viewing
    }

    /**
     * Insights actions
     */
    generateInsights() {
        console.log('Generating new insights...');
        this.showLoading();
        
        // Simulate insight generation
        setTimeout(() => {
            this.loadInsights();
            this.hideLoading();
        }, 2000);
    }

    /**
     * Funnel actions
     */
    analyzeFunnel() {
        console.log('Analyzing funnel...');
        // Implement funnel analysis
    }

    /**
     * Cleanup
     */
    destroy() {
        // Destroy all charts
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        
        // Clear intervals
        this.stopAutoRefresh();
        
        // Clear analytics service
        if (this.analyticsService && this.analyticsService.destroy) {
            this.analyticsService.destroy();
        }
    }
}

// Initialize dashboard when DOM is loaded
let dashboard;

document.addEventListener('DOMContentLoaded', () => {
    dashboard = new AnalyticsDashboard();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (dashboard) {
        dashboard.destroy();
    }
});
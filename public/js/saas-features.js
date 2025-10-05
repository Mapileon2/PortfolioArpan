/**
 * SaaS Features Module
 * Provides enterprise-grade features for the portfolio admin system
 */

class SaaSFeatures {
    constructor() {
        this.features = {
            analytics: true,
            multiUser: true,
            apiAccess: true,
            customBranding: true,
            advancedSecurity: true,
            backup: true,
            integrations: true,
            support: true
        };
        
        this.init();
    }

    init() {
        this.setupAnalytics();
        this.setupUserManagement();
        this.setupAPIAccess();
        this.setupBackupSystem();
        this.setupIntegrations();
        this.setupBilling();
        this.setupSupport();
    }

    // ==================== ANALYTICS DASHBOARD ====================

    setupAnalytics() {
        this.analytics = {
            pageViews: 0,
            uniqueVisitors: 0,
            bounceRate: 0,
            avgSessionDuration: 0,
            topPages: [],
            trafficSources: [],
            deviceStats: [],
            locationStats: []
        };

        this.trackPageView();
        this.setupRealTimeAnalytics();
    }

    trackPageView() {
        // Track page view
        const pageData = {
            url: window.location.href,
            title: document.title,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            referrer: document.referrer,
            sessionId: this.getSessionId()
        };

        this.sendAnalyticsEvent('page_view', pageData);
    }

    setupRealTimeAnalytics() {
        // Real-time visitor tracking
        if (window.authSystem?.isAuthenticated()) {
            setInterval(() => {
                this.sendHeartbeat();
            }, 30000); // Send heartbeat every 30 seconds
        }
    }

    async sendAnalyticsEvent(event, data) {
        try {
            await fetch('/api/analytics/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.authSystem?.getToken()}`
                },
                body: JSON.stringify({ event, data, timestamp: new Date().toISOString() })
            });
        } catch (error) {
            console.error('Analytics event failed:', error);
        }
    }

    async getAnalyticsData(timeRange = '7d') {
        try {
            const response = await fetch(`/api/analytics/dashboard?range=${timeRange}`, {
                headers: {
                    'Authorization': `Bearer ${window.authSystem?.getToken()}`
                }
            });
            
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Analytics data fetch failed:', error);
        }
        
        return this.getMockAnalyticsData();
    }

    getMockAnalyticsData() {
        return {
            pageViews: 1234,
            uniqueVisitors: 567,
            bounceRate: 45.2,
            avgSessionDuration: 180,
            topPages: [
                { page: '/', views: 456, percentage: 37 },
                { page: '/projects', views: 234, percentage: 19 },
                { page: '/about', views: 123, percentage: 10 }
            ],
            trafficSources: [
                { source: 'Direct', visitors: 234, percentage: 41 },
                { source: 'Google', visitors: 156, percentage: 28 },
                { source: 'Social Media', visitors: 89, percentage: 16 }
            ],
            deviceStats: [
                { device: 'Desktop', users: 345, percentage: 61 },
                { device: 'Mobile', users: 178, percentage: 31 },
                { device: 'Tablet', users: 44, percentage: 8 }
            ]
        };
    }

    // ==================== USER MANAGEMENT ====================

    setupUserManagement() {
        this.userRoles = {
            'super_admin': {
                name: 'Super Administrator',
                permissions: ['*'],
                description: 'Full system access'
            },
            'admin': {
                name: 'Administrator',
                permissions: ['users:*', 'content:*', 'analytics:read', 'settings:*'],
                description: 'Full content and user management'
            },
            'editor': {
                name: 'Editor',
                permissions: ['content:write', 'content:read', 'projects:*', 'carousel:*'],
                description: 'Content creation and editing'
            },
            'viewer': {
                name: 'Viewer',
                permissions: ['content:read', 'analytics:read'],
                description: 'Read-only access'
            }
        };
    }

    async inviteUser(userData) {
        try {
            const response = await fetch('/api/users/invite', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.authSystem?.getToken()}`
                },
                body: JSON.stringify({
                    email: userData.email,
                    role: userData.role,
                    permissions: userData.permissions,
                    message: userData.message
                })
            });

            if (response.ok) {
                const result = await response.json();
                this.showNotification('success', `Invitation sent to ${userData.email}`);
                return result;
            } else {
                throw new Error('Failed to send invitation');
            }
        } catch (error) {
            this.showNotification('error', error.message);
            throw error;
        }
    }

    async getUserList() {
        try {
            const response = await fetch('/api/users', {
                headers: {
                    'Authorization': `Bearer ${window.authSystem?.getToken()}`
                }
            });

            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('User list fetch failed:', error);
        }

        // Mock data
        return [
            {
                id: '1',
                name: 'John Doe',
                email: 'john@example.com',
                role: 'admin',
                status: 'active',
                lastLogin: new Date().toISOString(),
                avatar: 'https://via.placeholder.com/40'
            },
            {
                id: '2',
                name: 'Jane Smith',
                email: 'jane@example.com',
                role: 'editor',
                status: 'active',
                lastLogin: new Date(Date.now() - 86400000).toISOString(),
                avatar: 'https://via.placeholder.com/40'
            }
        ];
    }

    async updateUserRole(userId, newRole) {
        try {
            const response = await fetch(`/api/users/${userId}/role`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.authSystem?.getToken()}`
                },
                body: JSON.stringify({ role: newRole })
            });

            if (response.ok) {
                this.showNotification('success', 'User role updated successfully');
                return await response.json();
            } else {
                throw new Error('Failed to update user role');
            }
        } catch (error) {
            this.showNotification('error', error.message);
            throw error;
        }
    }

    // ==================== API ACCESS MANAGEMENT ====================

    setupAPIAccess() {
        this.apiKeys = new Map();
    }

    async generateAPIKey(name, permissions = []) {
        try {
            const response = await fetch('/api/api-keys', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.authSystem?.getToken()}`
                },
                body: JSON.stringify({ name, permissions })
            });

            if (response.ok) {
                const result = await response.json();
                this.showNotification('success', 'API key generated successfully');
                return result;
            } else {
                throw new Error('Failed to generate API key');
            }
        } catch (error) {
            this.showNotification('error', error.message);
            throw error;
        }
    }

    async getAPIKeys() {
        try {
            const response = await fetch('/api/api-keys', {
                headers: {
                    'Authorization': `Bearer ${window.authSystem?.getToken()}`
                }
            });

            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('API keys fetch failed:', error);
        }

        // Mock data
        return [
            {
                id: 'key_1',
                name: 'Portfolio API',
                key: 'pk_live_...',
                permissions: ['projects:read', 'carousel:read'],
                created: new Date().toISOString(),
                lastUsed: new Date().toISOString(),
                status: 'active'
            }
        ];
    }

    async revokeAPIKey(keyId) {
        try {
            const response = await fetch(`/api/api-keys/${keyId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${window.authSystem?.getToken()}`
                }
            });

            if (response.ok) {
                this.showNotification('success', 'API key revoked successfully');
                return true;
            } else {
                throw new Error('Failed to revoke API key');
            }
        } catch (error) {
            this.showNotification('error', error.message);
            throw error;
        }
    }

    // ==================== BACKUP SYSTEM ====================

    setupBackupSystem() {
        this.backupSchedule = {
            daily: true,
            weekly: true,
            monthly: true
        };
    }

    async createBackup(type = 'manual') {
        try {
            const response = await fetch('/api/backups', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.authSystem?.getToken()}`
                },
                body: JSON.stringify({ type })
            });

            if (response.ok) {
                const result = await response.json();
                this.showNotification('success', 'Backup created successfully');
                return result;
            } else {
                throw new Error('Failed to create backup');
            }
        } catch (error) {
            this.showNotification('error', error.message);
            throw error;
        }
    }

    async getBackupList() {
        try {
            const response = await fetch('/api/backups', {
                headers: {
                    'Authorization': `Bearer ${window.authSystem?.getToken()}`
                }
            });

            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Backup list fetch failed:', error);
        }

        // Mock data
        return [
            {
                id: 'backup_1',
                type: 'daily',
                size: '2.4 MB',
                created: new Date().toISOString(),
                status: 'completed'
            },
            {
                id: 'backup_2',
                type: 'manual',
                size: '2.3 MB',
                created: new Date(Date.now() - 86400000).toISOString(),
                status: 'completed'
            }
        ];
    }

    async restoreBackup(backupId) {
        if (!confirm('Are you sure you want to restore this backup? This will overwrite current data.')) {
            return;
        }

        try {
            const response = await fetch(`/api/backups/${backupId}/restore`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${window.authSystem?.getToken()}`
                }
            });

            if (response.ok) {
                this.showNotification('success', 'Backup restored successfully');
                setTimeout(() => window.location.reload(), 2000);
                return await response.json();
            } else {
                throw new Error('Failed to restore backup');
            }
        } catch (error) {
            this.showNotification('error', error.message);
            throw error;
        }
    }

    // ==================== INTEGRATIONS ====================

    setupIntegrations() {
        this.availableIntegrations = {
            'google-analytics': {
                name: 'Google Analytics',
                description: 'Track website analytics',
                icon: 'fab fa-google',
                status: 'available'
            },
            'mailchimp': {
                name: 'Mailchimp',
                description: 'Email marketing integration',
                icon: 'fab fa-mailchimp',
                status: 'available'
            },
            'slack': {
                name: 'Slack',
                description: 'Team notifications',
                icon: 'fab fa-slack',
                status: 'connected'
            },
            'github': {
                name: 'GitHub',
                description: 'Code repository integration',
                icon: 'fab fa-github',
                status: 'available'
            }
        };
    }

    async connectIntegration(integrationId, config) {
        try {
            const response = await fetch(`/api/integrations/${integrationId}/connect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.authSystem?.getToken()}`
                },
                body: JSON.stringify(config)
            });

            if (response.ok) {
                this.showNotification('success', 'Integration connected successfully');
                return await response.json();
            } else {
                throw new Error('Failed to connect integration');
            }
        } catch (error) {
            this.showNotification('error', error.message);
            throw error;
        }
    }

    async disconnectIntegration(integrationId) {
        try {
            const response = await fetch(`/api/integrations/${integrationId}/disconnect`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${window.authSystem?.getToken()}`
                }
            });

            if (response.ok) {
                this.showNotification('success', 'Integration disconnected');
                return true;
            } else {
                throw new Error('Failed to disconnect integration');
            }
        } catch (error) {
            this.showNotification('error', error.message);
            throw error;
        }
    }

    // ==================== BILLING & SUBSCRIPTION ====================

    setupBilling() {
        this.plans = {
            'free': {
                name: 'Free',
                price: 0,
                features: ['1 User', 'Basic Analytics', '5 Projects'],
                limits: { users: 1, projects: 5, storage: '100MB' }
            },
            'pro': {
                name: 'Professional',
                price: 29,
                features: ['5 Users', 'Advanced Analytics', 'Unlimited Projects', 'API Access'],
                limits: { users: 5, projects: -1, storage: '10GB' }
            },
            'enterprise': {
                name: 'Enterprise',
                price: 99,
                features: ['Unlimited Users', 'Custom Branding', 'Priority Support', 'Advanced Security'],
                limits: { users: -1, projects: -1, storage: '100GB' }
            }
        };
    }

    async getCurrentSubscription() {
        try {
            const response = await fetch('/api/billing/subscription', {
                headers: {
                    'Authorization': `Bearer ${window.authSystem?.getToken()}`
                }
            });

            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Subscription fetch failed:', error);
        }

        // Mock data
        return {
            plan: 'pro',
            status: 'active',
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            usage: {
                users: 2,
                projects: 15,
                storage: '2.4GB'
            }
        };
    }

    async upgradePlan(planId) {
        try {
            const response = await fetch('/api/billing/upgrade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.authSystem?.getToken()}`
                },
                body: JSON.stringify({ plan: planId })
            });

            if (response.ok) {
                this.showNotification('success', 'Plan upgraded successfully');
                return await response.json();
            } else {
                throw new Error('Failed to upgrade plan');
            }
        } catch (error) {
            this.showNotification('error', error.message);
            throw error;
        }
    }

    // ==================== SUPPORT SYSTEM ====================

    setupSupport() {
        this.supportChannels = {
            chat: true,
            email: true,
            phone: false // Only for enterprise
        };
    }

    async createSupportTicket(ticketData) {
        try {
            const response = await fetch('/api/support/tickets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.authSystem?.getToken()}`
                },
                body: JSON.stringify(ticketData)
            });

            if (response.ok) {
                const result = await response.json();
                this.showNotification('success', 'Support ticket created successfully');
                return result;
            } else {
                throw new Error('Failed to create support ticket');
            }
        } catch (error) {
            this.showNotification('error', error.message);
            throw error;
        }
    }

    async getSupportTickets() {
        try {
            const response = await fetch('/api/support/tickets', {
                headers: {
                    'Authorization': `Bearer ${window.authSystem?.getToken()}`
                }
            });

            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Support tickets fetch failed:', error);
        }

        // Mock data
        return [
            {
                id: 'ticket_1',
                subject: 'Image upload issue',
                status: 'open',
                priority: 'medium',
                created: new Date().toISOString(),
                lastUpdate: new Date().toISOString()
            }
        ];
    }

    // ==================== UTILITY METHODS ====================

    getSessionId() {
        let sessionId = sessionStorage.getItem('portfolio_session_id');
        if (!sessionId) {
            sessionId = 'sess_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
            sessionStorage.setItem('portfolio_session_id', sessionId);
        }
        return sessionId;
    }

    async sendHeartbeat() {
        try {
            await fetch('/api/analytics/heartbeat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.authSystem?.getToken()}`
                },
                body: JSON.stringify({
                    sessionId: this.getSessionId(),
                    timestamp: new Date().toISOString(),
                    page: window.location.pathname
                })
            });
        } catch (error) {
            console.error('Heartbeat failed:', error);
        }
    }

    showNotification(type, message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
            type === 'success' ? 'bg-green-500' : 
            type === 'error' ? 'bg-red-500' : 
            type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
        } text-white transform translate-x-full transition-transform duration-300`;
        
        notification.innerHTML = `
            <div class="flex items-center space-x-2">
                <i class="fas fa-${
                    type === 'success' ? 'check-circle' : 
                    type === 'error' ? 'exclamation-circle' : 
                    type === 'warning' ? 'exclamation-triangle' : 'info-circle'
                }"></i>
                <span>${message}</span>
                <button class="ml-2 text-white hover:text-gray-200" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        document.body.appendChild(notification);

        // Slide in
        setTimeout(() => notification.classList.remove('translate-x-full'), 100);

        // Auto remove
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    // ==================== PUBLIC API ====================

    getFeatureStatus(feature) {
        return this.features[feature] || false;
    }

    async exportData(format = 'json') {
        try {
            const response = await fetch(`/api/export?format=${format}`, {
                headers: {
                    'Authorization': `Bearer ${window.authSystem?.getToken()}`
                }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `portfolio-export-${new Date().toISOString().split('T')[0]}.${format}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                
                this.showNotification('success', 'Data exported successfully');
            } else {
                throw new Error('Export failed');
            }
        } catch (error) {
            this.showNotification('error', error.message);
            throw error;
        }
    }

    async importData(file) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/import', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${window.authSystem?.getToken()}`
                },
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                this.showNotification('success', 'Data imported successfully');
                return result;
            } else {
                throw new Error('Import failed');
            }
        } catch (error) {
            this.showNotification('error', error.message);
            throw error;
        }
    }
}

// Create global instance
window.saasFeatures = new SaaSFeatures();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SaaSFeatures;
}
/**
 * Modern SaaS Authentication System
 * Features: JWT tokens, role-based access, session management, security features
 */

class AuthSystem {
    constructor() {
        this.apiBase = '/api/auth';
        this.tokenKey = 'portfolio_auth_token';
        this.refreshTokenKey = 'portfolio_refresh_token';
        this.userKey = 'portfolio_user_data';
        this.sessionKey = 'portfolio_session_id';
        
        // Token refresh settings
        this.tokenRefreshBuffer = 5 * 60 * 1000; // 5 minutes before expiry
        this.maxRetries = 3;
        this.retryDelay = 1000;
        
        // Security settings
        this.maxLoginAttempts = 5;
        this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
        this.sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
        
        this.currentUser = null;
        this.currentProfile = null;
        this.permissions = new Set();
        this.refreshTimer = null;
        this.activityTimer = null;
        this.supabaseAPI = null;
        
        this.init();
    }

    async init() {
        // Wait for Supabase API to be ready
        await this.waitForSupabaseAPI();
        
        // Check for existing session
        await this.checkExistingSession();
        
        // Setup activity monitoring
        this.setupActivityMonitoring();
        
        // Setup automatic token refresh
        this.setupTokenRefresh();
        
        // Setup security monitoring
        this.setupSecurityMonitoring();
    }

    async waitForSupabaseAPI() {
        return new Promise((resolve) => {
            const checkSupabase = () => {
                if (window.supabaseAPI) {
                    this.supabaseAPI = window.supabaseAPI;
                    resolve();
                } else {
                    setTimeout(checkSupabase, 100);
                }
            };
            checkSupabase();
        });
    }

    // ==================== AUTHENTICATION METHODS ====================

    async login(credentials) {
        try {
            // Check for rate limiting
            if (this.isRateLimited()) {
                throw new Error('Too many login attempts. Please try again later.');
            }

            // Use Supabase for authentication
            const result = await this.supabaseAPI.signIn(credentials.email, credentials.password);

            if (!result.success) {
                this.recordFailedAttempt();
                throw new Error('Login failed');
            }

            // Store user data and profile
            this.currentUser = result.user;
            this.currentProfile = result.profile;
            
            // Set permissions based on profile role
            if (result.profile) {
                this.permissions = new Set(result.profile.permissions || []);
            }

            // Store session data
            localStorage.setItem(this.userKey, JSON.stringify({
                ...result.user,
                profile: result.profile
            }));
            
            // Clear failed attempts
            this.clearFailedAttempts();
            
            // Log successful login
            this.logSecurityEvent('login_success', {
                userId: this.currentUser.id,
                email: this.currentUser.email,
                timestamp: new Date().toISOString()
            });
            
            return {
                success: true,
                user: this.currentUser,
                profile: this.currentProfile,
                permissions: Array.from(this.permissions)
            };

        } catch (error) {
            console.error('Login error:', error);
            this.recordFailedAttempt();
            throw error;
        }
    }

    async register(userData) {
        try {
            // Use Supabase for registration
            const result = await this.supabaseAPI.signUp(userData.email, userData.password, {
                name: userData.name,
                role: userData.role || 'viewer'
            });

            if (!result.success) {
                throw new Error('Registration failed');
            }

            // If user is created and session exists, they're logged in
            if (result.user && result.session) {
                this.currentUser = result.user;
                
                // Get user profile
                const profile = await this.supabaseAPI.getUserProfile(result.user.id);
                this.currentProfile = profile;
                
                if (profile) {
                    this.permissions = new Set(profile.permissions || []);
                }

                // Store session data
                localStorage.setItem(this.userKey, JSON.stringify({
                    ...result.user,
                    profile: profile
                }));
            }
            
            return {
                success: true,
                user: result.user,
                profile: this.currentProfile,
                requiresVerification: result.requiresVerification
            };

        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    }

    async logout() {
        try {
            // Use Supabase for logout
            await this.supabaseAPI.signOut();

        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Clear local data regardless of server response
            this.clearAuthData();
            this.clearTimers();
            
            // Redirect to login
            window.location.href = '/admin-login-v2.html';
        }
    }

    async refreshToken() {
        try {
            const refreshToken = localStorage.getItem(this.refreshTokenKey);
            
            if (!refreshToken) {
                throw new Error('No refresh token available');
            }

            const response = await this.makeRequest('/refresh', {
                method: 'POST',
                body: JSON.stringify({
                    refreshToken,
                    sessionId: localStorage.getItem(this.sessionKey)
                })
            });

            if (!response.success) {
                throw new Error('Token refresh failed');
            }

            // Update tokens
            localStorage.setItem(this.tokenKey, response.data.accessToken);
            localStorage.setItem(this.refreshTokenKey, response.data.refreshToken);
            
            // Update user data if provided
            if (response.data.user) {
                this.currentUser = response.data.user;
                localStorage.setItem(this.userKey, JSON.stringify(this.currentUser));
            }

            return response.data.accessToken;

        } catch (error) {
            console.error('Token refresh error:', error);
            // If refresh fails, logout user
            await this.logout();
            throw error;
        }
    }

    // ==================== SESSION MANAGEMENT ====================

    async checkExistingSession() {
        try {
            // Check Supabase session
            const session = await this.supabaseAPI.getCurrentSession();
            
            if (session && session.user) {
                this.currentUser = session.user;
                
                // Get user profile
                const profile = await this.supabaseAPI.getUserProfile(session.user.id);
                this.currentProfile = profile;
                
                if (profile) {
                    this.permissions = new Set(profile.permissions || []);
                }

                // Store session data
                localStorage.setItem(this.userKey, JSON.stringify({
                    ...session.user,
                    profile: profile
                }));
                
                this.updateLastActivity();
                return true;
            }

            return false;

        } catch (error) {
            console.error('Session verification error:', error);
            this.clearAuthData();
            return false;
        }
    }

    async handleSuccessfulAuth(authData) {
        // Store tokens
        localStorage.setItem(this.tokenKey, authData.accessToken);
        localStorage.setItem(this.refreshTokenKey, authData.refreshToken);
        localStorage.setItem(this.sessionKey, authData.sessionId);
        
        // Store user data
        this.currentUser = authData.user;
        localStorage.setItem(this.userKey, JSON.stringify(this.currentUser));
        
        // Store permissions
        this.permissions = new Set(authData.permissions || []);
        
        // Update activity
        this.updateLastActivity();
        
        // Setup automatic refresh
        this.setupTokenRefresh();
        
        // Log successful login
        this.logSecurityEvent('login_success', {
            userId: this.currentUser.id,
            email: this.currentUser.email,
            timestamp: new Date().toISOString()
        });
    }

    // ==================== PERMISSION SYSTEM ====================

    hasPermission(permission) {
        return this.permissions.has(permission) || this.permissions.has('admin');
    }

    hasRole(role) {
        return this.currentUser && this.currentUser.role === role;
    }

    canAccess(resource, action = 'read') {
        const permission = `${resource}:${action}`;
        return this.hasPermission(permission);
    }

    requirePermission(permission) {
        if (!this.hasPermission(permission)) {
            throw new Error(`Access denied. Required permission: ${permission}`);
        }
    }

    requireRole(role) {
        if (!this.hasRole(role)) {
            throw new Error(`Access denied. Required role: ${role}`);
        }
    }

    // ==================== SECURITY FEATURES ====================

    setupSecurityMonitoring() {
        // Monitor for suspicious activity
        this.monitorDeviceChanges();
        this.monitorLocationChanges();
        this.setupCSRFProtection();
    }

    monitorDeviceChanges() {
        const currentDevice = this.getDeviceInfo();
        const storedDevice = localStorage.getItem('portfolio_device_info');
        
        if (storedDevice && storedDevice !== JSON.stringify(currentDevice)) {
            this.logSecurityEvent('device_change', {
                oldDevice: JSON.parse(storedDevice),
                newDevice: currentDevice
            });
            
            // Optionally require re-authentication
            if (this.currentUser?.securitySettings?.requireReauthOnDeviceChange) {
                this.logout();
                return;
            }
        }
        
        localStorage.setItem('portfolio_device_info', JSON.stringify(currentDevice));
    }

    async monitorLocationChanges() {
        try {
            const response = await fetch('https://ipapi.co/json/');
            const locationData = await response.json();
            
            const storedLocation = localStorage.getItem('portfolio_location_info');
            
            if (storedLocation) {
                const oldLocation = JSON.parse(storedLocation);
                if (oldLocation.country !== locationData.country) {
                    this.logSecurityEvent('location_change', {
                        oldLocation,
                        newLocation: locationData
                    });
                    
                    // Send security alert
                    this.sendSecurityAlert('location_change', locationData);
                }
            }
            
            localStorage.setItem('portfolio_location_info', JSON.stringify(locationData));
            
        } catch (error) {
            console.warn('Location monitoring failed:', error);
        }
    }

    setupCSRFProtection() {
        // Add CSRF token to all requests
        const originalFetch = window.fetch;
        window.fetch = async (url, options = {}) => {
            if (this.isAuthenticatedRequest(url, options)) {
                options.headers = {
                    ...options.headers,
                    'X-CSRF-Token': await this.getCSRFToken(),
                    'X-Session-ID': localStorage.getItem(this.sessionKey)
                };
            }
            return originalFetch(url, options);
        };
    }

    async getCSRFToken() {
        let token = sessionStorage.getItem('csrf_token');
        
        if (!token) {
            try {
                const response = await this.makeRequest('/csrf-token');
                token = response.data.token;
                sessionStorage.setItem('csrf_token', token);
            } catch (error) {
                console.error('CSRF token fetch failed:', error);
                return '';
            }
        }
        
        return token;
    }

    // ==================== ACTIVITY MONITORING ====================

    setupActivityMonitoring() {
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        
        events.forEach(event => {
            document.addEventListener(event, () => {
                this.updateLastActivity();
            }, { passive: true });
        });
        
        // Check for inactivity
        this.activityTimer = setInterval(() => {
            this.checkInactivity();
        }, 60000); // Check every minute
    }

    updateLastActivity() {
        localStorage.setItem('portfolio_last_activity', Date.now().toString());
    }

    checkInactivity() {
        const lastActivity = parseInt(localStorage.getItem('portfolio_last_activity') || '0');
        const now = Date.now();
        
        if (now - lastActivity > this.sessionTimeout) {
            this.logSecurityEvent('session_timeout');
            this.logout();
        }
    }

    // ==================== TOKEN MANAGEMENT ====================

    setupTokenRefresh() {
        this.clearTimers();
        
        const token = this.getToken();
        if (!token) return;
        
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const expiryTime = payload.exp * 1000;
            const refreshTime = expiryTime - this.tokenRefreshBuffer;
            const timeUntilRefresh = refreshTime - Date.now();
            
            if (timeUntilRefresh > 0) {
                this.refreshTimer = setTimeout(() => {
                    this.refreshToken().catch(console.error);
                }, timeUntilRefresh);
            } else {
                // Token already expired or about to expire
                this.refreshToken().catch(console.error);
            }
            
        } catch (error) {
            console.error('Token parsing error:', error);
            this.logout();
        }
    }

    getToken() {
        return localStorage.getItem(this.tokenKey);
    }

    isTokenExpired(token = null) {
        token = token || this.getToken();
        if (!token) return true;
        
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return Date.now() >= payload.exp * 1000;
        } catch (error) {
            return true;
        }
    }

    // ==================== RATE LIMITING ====================

    isRateLimited() {
        const attempts = this.getFailedAttempts();
        const lastAttempt = localStorage.getItem('portfolio_last_failed_attempt');
        
        if (attempts >= this.maxLoginAttempts) {
            const timeSinceLastAttempt = Date.now() - parseInt(lastAttempt || '0');
            return timeSinceLastAttempt < this.lockoutDuration;
        }
        
        return false;
    }

    recordFailedAttempt() {
        const attempts = this.getFailedAttempts() + 1;
        localStorage.setItem('portfolio_failed_attempts', attempts.toString());
        localStorage.setItem('portfolio_last_failed_attempt', Date.now().toString());
        
        this.logSecurityEvent('login_failed', { attempts });
    }

    getFailedAttempts() {
        return parseInt(localStorage.getItem('portfolio_failed_attempts') || '0');
    }

    clearFailedAttempts() {
        localStorage.removeItem('portfolio_failed_attempts');
        localStorage.removeItem('portfolio_last_failed_attempt');
    }

    // ==================== UTILITY METHODS ====================

    async makeRequest(endpoint, options = {}) {
        const url = `${this.apiBase}${endpoint}`;
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        };
        
        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };
        
        let retries = 0;
        while (retries < this.maxRetries) {
            try {
                const response = await fetch(url, mergedOptions);
                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.message || `HTTP ${response.status}`);
                }
                
                return data;
                
            } catch (error) {
                retries++;
                if (retries >= this.maxRetries) {
                    throw error;
                }
                
                await new Promise(resolve => setTimeout(resolve, this.retryDelay * retries));
            }
        }
    }

    isAuthenticatedRequest(url, options) {
        return url.startsWith('/api/') && 
               !url.includes('/auth/login') && 
               !url.includes('/auth/register') &&
               !url.includes('/auth/csrf-token');
    }

    getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            screen: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            cookieEnabled: navigator.cookieEnabled,
            onlineStatus: navigator.onLine
        };
    }

    generateSessionId() {
        return 'sess_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    }

    logSecurityEvent(event, data = {}) {
        const logEntry = {
            event,
            timestamp: new Date().toISOString(),
            userId: this.currentUser?.id,
            sessionId: localStorage.getItem(this.sessionKey),
            deviceInfo: this.getDeviceInfo(),
            ...data
        };
        
        // Store locally
        const logs = JSON.parse(localStorage.getItem('portfolio_security_logs') || '[]');
        logs.push(logEntry);
        
        // Keep only last 100 entries
        if (logs.length > 100) {
            logs.splice(0, logs.length - 100);
        }
        
        localStorage.setItem('portfolio_security_logs', JSON.stringify(logs));
        
        // Send to server (fire and forget)
        this.makeRequest('/security-log', {
            method: 'POST',
            body: JSON.stringify(logEntry)
        }).catch(console.error);
    }

    async sendSecurityAlert(type, data) {
        try {
            await this.makeRequest('/security-alert', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.getToken()}` },
                body: JSON.stringify({ type, data })
            });
        } catch (error) {
            console.error('Security alert failed:', error);
        }
    }

    clearAuthData() {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.refreshTokenKey);
        localStorage.removeItem(this.userKey);
        localStorage.removeItem(this.sessionKey);
        sessionStorage.removeItem('csrf_token');
        
        this.currentUser = null;
        this.permissions.clear();
    }

    clearTimers() {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
        
        if (this.activityTimer) {
            clearInterval(this.activityTimer);
            this.activityTimer = null;
        }
    }

    // ==================== PUBLIC API ====================

    isAuthenticated() {
        // For Supabase integration, check if we have a current user
        return !!this.currentUser || (this.supabaseAPI && this.supabaseAPI.isAuthenticated());
    }

    getCurrentUser() {
        return this.currentUser;
    }

    getPermissions() {
        return Array.from(this.permissions);
    }

    async changePassword(currentPassword, newPassword) {
        const response = await this.makeRequest('/change-password', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${this.getToken()}` },
            body: JSON.stringify({ currentPassword, newPassword })
        });
        
        if (!response.success) {
            throw new Error(response.message || 'Password change failed');
        }
        
        this.logSecurityEvent('password_changed');
        return response;
    }

    async updateProfile(profileData) {
        const response = await this.makeRequest('/profile', {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${this.getToken()}` },
            body: JSON.stringify(profileData)
        });
        
        if (response.success) {
            this.currentUser = { ...this.currentUser, ...response.data };
            localStorage.setItem(this.userKey, JSON.stringify(this.currentUser));
        }
        
        return response;
    }

    async getSecurityLogs() {
        const response = await this.makeRequest('/security-logs', {
            headers: { 'Authorization': `Bearer ${this.getToken()}` }
        });
        
        return response.data || [];
    }

    async getActiveSessions() {
        const response = await this.makeRequest('/sessions', {
            headers: { 'Authorization': `Bearer ${this.getToken()}` }
        });
        
        return response.data || [];
    }

    async revokeSession(sessionId) {
        const response = await this.makeRequest(`/sessions/${sessionId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${this.getToken()}` }
        });
        
        return response;
    }
}

// Create global instance
window.authSystem = new AuthSystem();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthSystem;
}
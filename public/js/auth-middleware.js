/**
 * Authentication Middleware for Admin Pages
 * Automatically protects admin pages and provides SaaS-like features
 */

class AuthMiddleware {
    constructor() {
        this.protectedPaths = [
            '/admin',
            '/admin-dashboard',
            '/admin-full',
            '/magical-journeys',
            '/case_study_editor'
        ];
        
        this.publicPaths = [
            '/admin-login',
            '/admin-login-v2',
            '/simple-login',
            '/direct-login'
        ];
        
        this.init();
    }

    init() {
        // Check if current page needs protection
        if (this.isProtectedPage()) {
            this.enforceAuthentication();
        }
        
        // Setup global auth state monitoring
        this.setupAuthStateMonitoring();
        
        // Setup automatic token refresh
        this.setupTokenRefresh();
        
        // Setup session management
        this.setupSessionManagement();
    }

    isProtectedPage() {
        const currentPath = window.location.pathname;
        return this.protectedPaths.some(path => 
            currentPath.includes(path) || 
            currentPath.startsWith(path)
        );
    }

    isPublicPage() {
        const currentPath = window.location.pathname;
        return this.publicPaths.some(path => 
            currentPath.includes(path) || 
            currentPath.startsWith(path)
        );
    }

    async enforceAuthentication() {
        // Wait for auth system to be ready
        await this.waitForAuthSystem();
        
        // Check authentication status
        const isAuthenticated = await this.checkAuthentication();
        
        if (!isAuthenticated) {
            this.redirectToLogin();
            return;
        }
        
        // Check permissions for specific pages
        if (!this.checkPagePermissions()) {
            this.showAccessDenied();
            return;
        }
        
        // Setup authenticated user features
        this.setupAuthenticatedFeatures();
    }

    async waitForAuthSystem() {
        return new Promise((resolve) => {
            const checkAuth = () => {
                if (window.authSystem) {
                    resolve();
                } else {
                    setTimeout(checkAuth, 100);
                }
            };
            checkAuth();
        });
    }

    async checkAuthentication() {
        try {
            if (!window.authSystem) {
                return false;
            }
            
            // Check if user is authenticated
            if (!window.authSystem.isAuthenticated()) {
                // Try to restore session
                const restored = await window.authSystem.checkExistingSession();
                return restored;
            }
            
            return true;
            
        } catch (error) {
            console.error('Authentication check failed:', error);
            return false;
        }
    }

    checkPagePermissions() {
        const currentPath = window.location.pathname;
        const user = window.authSystem.getCurrentUser();
        
        if (!user) return false;
        
        // Define page-specific permissions
        const pagePermissions = {
            '/admin-dashboard': ['admin', 'editor'],
            '/admin-full': ['admin'],
            '/magical-journeys': ['admin', 'editor'],
            '/case_study_editor': ['admin', 'editor']
        };
        
        // Check if current page has specific requirements
        for (const [path, requiredRoles] of Object.entries(pagePermissions)) {
            if (currentPath.includes(path)) {
                return requiredRoles.includes(user.role) || 
                       window.authSystem.hasPermission('admin');
            }
        }
        
        // Default: allow if authenticated
        return true;
    }

    redirectToLogin() {
        // Store the intended destination
        sessionStorage.setItem('auth_redirect_url', window.location.href);
        
        // Show loading message
        this.showAuthLoading();
        
        // Redirect to login
        setTimeout(() => {
            window.location.href = '/admin-login-v2.html';
        }, 1000);
    }

    showAuthLoading() {
        // Create loading overlay
        const overlay = document.createElement('div');
        overlay.id = 'auth-loading-overlay';
        overlay.className = 'fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50';
        overlay.innerHTML = `
            <div class="bg-white rounded-lg p-8 max-w-sm mx-4 text-center">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Authentication Required</h3>
                <p class="text-gray-600">Redirecting to login page...</p>
            </div>
        `;
        
        document.body.appendChild(overlay);
    }

    showAccessDenied() {
        // Create access denied overlay
        const overlay = document.createElement('div');
        overlay.id = 'access-denied-overlay';
        overlay.className = 'fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50';
        overlay.innerHTML = `
            <div class="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
                <div class="text-red-500 text-6xl mb-4">
                    <i class="fas fa-lock"></i>
                </div>
                <h3 class="text-xl font-semibold text-gray-900 mb-2">Access Denied</h3>
                <p class="text-gray-600 mb-6">You don't have permission to access this page.</p>
                <div class="space-x-3">
                    <button onclick="history.back()" class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600">
                        Go Back
                    </button>
                    <button onclick="window.location.href='/admin-dashboard.html'" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Dashboard
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
    }

    setupAuthenticatedFeatures() {
        // Add user info to page
        this.addUserInfo();
        
        // Setup logout functionality
        this.setupLogoutHandlers();
        
        // Setup session warnings
        this.setupSessionWarnings();
        
        // Setup activity tracking
        this.setupActivityTracking();
    }

    addUserInfo() {
        const user = window.authSystem.getCurrentUser();
        if (!user) return;
        
        // Add user info to existing elements
        const userElements = document.querySelectorAll('[data-user-name]');
        userElements.forEach(el => {
            el.textContent = user.name || user.email;
        });
        
        const emailElements = document.querySelectorAll('[data-user-email]');
        emailElements.forEach(el => {
            el.textContent = user.email;
        });
        
        const avatarElements = document.querySelectorAll('[data-user-avatar]');
        avatarElements.forEach(el => {
            if (user.avatar) {
                el.src = user.avatar;
            }
        });
        
        // Add role badges
        const roleElements = document.querySelectorAll('[data-user-role]');
        roleElements.forEach(el => {
            el.textContent = user.role || 'User';
            el.className += ` role-${user.role || 'user'}`;
        });
    }

    setupLogoutHandlers() {
        // Find all logout buttons and add handlers
        const logoutButtons = document.querySelectorAll('[data-logout], .logout-btn, #logout-btn, #logoutBtn');
        
        logoutButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                
                if (confirm('Are you sure you want to logout?')) {
                    try {
                        await window.authSystem.logout();
                    } catch (error) {
                        console.error('Logout error:', error);
                        // Force redirect even if logout fails
                        window.location.href = '/admin-login-v2.html';
                    }
                }
            });
        });
    }

    setupAuthStateMonitoring() {
        // Monitor for auth state changes
        setInterval(() => {
            if (this.isProtectedPage() && !window.authSystem?.isAuthenticated()) {
                this.handleAuthLoss();
            }
        }, 30000); // Check every 30 seconds
        
        // Listen for storage changes (logout in another tab)
        window.addEventListener('storage', (e) => {
            if (e.key === 'portfolio_auth_token' && !e.newValue) {
                this.handleAuthLoss();
            }
        });
        
        // Listen for focus events (check auth when user returns)
        window.addEventListener('focus', () => {
            if (this.isProtectedPage()) {
                this.checkAuthentication().then(isAuth => {
                    if (!isAuth) {
                        this.handleAuthLoss();
                    }
                });
            }
        });
    }

    setupTokenRefresh() {
        // Automatic token refresh before expiry
        setInterval(async () => {
            if (window.authSystem?.isAuthenticated()) {
                try {
                    const token = window.authSystem.getToken();
                    if (token && window.authSystem.isTokenExpired(token)) {
                        await window.authSystem.refreshToken();
                    }
                } catch (error) {
                    console.error('Token refresh failed:', error);
                    this.handleAuthLoss();
                }
            }
        }, 5 * 60 * 1000); // Check every 5 minutes
    }

    setupSessionManagement() {
        // Track user activity
        let lastActivity = Date.now();
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        
        activityEvents.forEach(event => {
            document.addEventListener(event, () => {
                lastActivity = Date.now();
            }, { passive: true });
        });
        
        // Check for inactivity
        setInterval(() => {
            const inactiveTime = Date.now() - lastActivity;
            const maxInactivity = 30 * 60 * 1000; // 30 minutes
            
            if (inactiveTime > maxInactivity && this.isProtectedPage()) {
                this.handleInactivity();
            }
        }, 60000); // Check every minute
    }

    setupSessionWarnings() {
        // Warn user before session expires
        setInterval(() => {
            if (window.authSystem?.isAuthenticated()) {
                const token = window.authSystem.getToken();
                if (token) {
                    try {
                        const payload = JSON.parse(atob(token.split('.')[1]));
                        const expiryTime = payload.exp * 1000;
                        const timeUntilExpiry = expiryTime - Date.now();
                        
                        // Warn 5 minutes before expiry
                        if (timeUntilExpiry > 0 && timeUntilExpiry < 5 * 60 * 1000) {
                            this.showSessionWarning(Math.floor(timeUntilExpiry / 60000));
                        }
                    } catch (error) {
                        console.error('Token parsing error:', error);
                    }
                }
            }
        }, 60000); // Check every minute
    }

    setupActivityTracking() {
        // Track page views and user actions
        if (window.authSystem?.isAuthenticated()) {
            // Track page view
            this.trackActivity('page_view', {
                page: window.location.pathname,
                timestamp: new Date().toISOString()
            });
            
            // Track user interactions
            document.addEventListener('click', (e) => {
                if (e.target.matches('button, a, [role="button"]')) {
                    this.trackActivity('user_interaction', {
                        element: e.target.tagName,
                        text: e.target.textContent?.substring(0, 50),
                        timestamp: new Date().toISOString()
                    });
                }
            });
        }
    }

    handleAuthLoss() {
        // Show session expired message
        this.showSessionExpired();
        
        // Clear any sensitive data
        this.clearSensitiveData();
        
        // Redirect to login after delay
        setTimeout(() => {
            window.location.href = '/admin-login-v2.html';
        }, 3000);
    }

    handleInactivity() {
        // Show inactivity warning
        this.showInactivityWarning();
    }

    showSessionWarning(minutesLeft) {
        // Remove existing warning
        const existing = document.getElementById('session-warning');
        if (existing) existing.remove();
        
        // Create warning
        const warning = document.createElement('div');
        warning.id = 'session-warning';
        warning.className = 'fixed top-4 right-4 bg-yellow-500 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm';
        warning.innerHTML = `
            <div class="flex items-center space-x-3">
                <i class="fas fa-exclamation-triangle text-xl"></i>
                <div>
                    <h4 class="font-semibold">Session Expiring</h4>
                    <p class="text-sm">Your session will expire in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}.</p>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="text-white hover:text-gray-200">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(warning);
        
        // Auto remove after 10 seconds
        setTimeout(() => {
            if (warning.parentNode) {
                warning.remove();
            }
        }, 10000);
    }

    showSessionExpired() {
        // Create session expired overlay
        const overlay = document.createElement('div');
        overlay.id = 'session-expired-overlay';
        overlay.className = 'fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50';
        overlay.innerHTML = `
            <div class="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
                <div class="text-red-500 text-6xl mb-4">
                    <i class="fas fa-clock"></i>
                </div>
                <h3 class="text-xl font-semibold text-gray-900 mb-2">Session Expired</h3>
                <p class="text-gray-600 mb-6">Your session has expired for security reasons. Please log in again.</p>
                <div class="animate-pulse text-blue-600">
                    <i class="fas fa-spinner fa-spin mr-2"></i>
                    Redirecting to login...
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
    }

    showInactivityWarning() {
        // Create inactivity warning
        const warning = document.createElement('div');
        warning.id = 'inactivity-warning';
        warning.className = 'fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50';
        warning.innerHTML = `
            <div class="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
                <div class="text-yellow-500 text-6xl mb-4">
                    <i class="fas fa-user-clock"></i>
                </div>
                <h3 class="text-xl font-semibold text-gray-900 mb-2">Are you still there?</h3>
                <p class="text-gray-600 mb-6">You've been inactive for a while. Click continue to stay logged in.</p>
                <div class="space-x-3">
                    <button onclick="window.authSystem.logout()" class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600">
                        Logout
                    </button>
                    <button onclick="document.getElementById('inactivity-warning').remove()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Continue Session
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(warning);
    }

    trackActivity(action, data = {}) {
        try {
            // Store activity locally
            const activities = JSON.parse(localStorage.getItem('portfolio_activities') || '[]');
            activities.push({
                action,
                data,
                timestamp: new Date().toISOString(),
                userId: window.authSystem?.getCurrentUser()?.id
            });
            
            // Keep only last 100 activities
            if (activities.length > 100) {
                activities.splice(0, activities.length - 100);
            }
            
            localStorage.setItem('portfolio_activities', JSON.stringify(activities));
            
            // Send to server (fire and forget)
            if (window.authSystem?.isAuthenticated()) {
                fetch('/api/activity', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${window.authSystem.getToken()}`
                    },
                    body: JSON.stringify({ action, data })
                }).catch(console.error);
            }
            
        } catch (error) {
            console.error('Activity tracking error:', error);
        }
    }

    clearSensitiveData() {
        // Clear any sensitive data from the page
        const sensitiveElements = document.querySelectorAll('[data-sensitive]');
        sensitiveElements.forEach(el => {
            el.textContent = '';
            el.value = '';
        });
        
        // Clear forms
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            form.reset();
        });
    }

    // Public API for manual auth checks
    static async requireAuth() {
        const middleware = new AuthMiddleware();
        await middleware.waitForAuthSystem();
        
        if (!window.authSystem?.isAuthenticated()) {
            middleware.redirectToLogin();
            return false;
        }
        
        return true;
    }

    static requirePermission(permission) {
        if (!window.authSystem?.hasPermission(permission)) {
            throw new Error(`Access denied. Required permission: ${permission}`);
        }
    }

    static requireRole(role) {
        const user = window.authSystem?.getCurrentUser();
        if (!user || user.role !== role) {
            throw new Error(`Access denied. Required role: ${role}`);
        }
    }
}

// Auto-initialize middleware
document.addEventListener('DOMContentLoaded', () => {
    new AuthMiddleware();
});

// Export for manual usage
window.AuthMiddleware = AuthMiddleware;
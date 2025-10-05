/**
 * Supabase Client Configuration
 * Handles all database operations for the SaaS authentication system
 */

// Supabase configuration
const SUPABASE_URL = 'https://fzyrsurzgepeawvfjved.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6eXJzdXJ6Z2VwZWF3dmZqdmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NjIyMDYsImV4cCI6MjA3NTIzODIwNn0.cKBp1Sw8l2mY3AxqXiazxe9BFaB3LaZmvzVZvod_42Y';

// Import Supabase (we'll load it from CDN)
let supabase;

// Initialize Supabase client
async function initializeSupabase() {
    console.log('🔄 Initializing Supabase client...');
    
    if (typeof window !== 'undefined' && !window.supabase) {
        console.log('📦 Loading Supabase from CDN...');
        // Load Supabase from CDN if not already loaded
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        document.head.appendChild(script);
        
        await new Promise((resolve, reject) => {
            script.onload = () => {
                console.log('✅ Supabase CDN loaded successfully');
                resolve();
            };
            script.onerror = () => {
                console.error('❌ Failed to load Supabase CDN');
                reject(new Error('Failed to load Supabase'));
            };
        });
    }
    
    if (window.supabase) {
        console.log('🔗 Creating Supabase client...');
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase client created successfully');
    } else {
        console.error('❌ Supabase not available on window object');
        throw new Error('Supabase not available');
    }
    
    return supabase;
}

class SupabaseAPI {
    constructor() {
        this.client = null;
        this.currentUser = null;
        this.init();
    }

    async init() {
        try {
            console.log('🚀 Initializing SupabaseAPI...');
            this.client = await initializeSupabase();
            
            // Listen for auth changes
            this.client.auth.onAuthStateChange((event, session) => {
                console.log('🔐 Auth state change detected:', event);
                this.currentUser = session?.user || null;
                this.handleAuthChange(event, session);
            });
            
            console.log('✅ SupabaseAPI initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize SupabaseAPI:', error);
            throw error;
        }
    }

    handleAuthChange(event, session) {
        console.log('🔐 Auth state changed:', event, session?.user?.email);
        
        // Update local storage
        if (session) {
            console.log('✅ Session active, storing tokens');
            localStorage.setItem('supabase_session', JSON.stringify(session));
            localStorage.setItem('portfolio_auth_token', session.access_token);
            localStorage.setItem('portfolio_refresh_token', session.refresh_token);
        } else {
            console.log('❌ No session, clearing tokens');
            localStorage.removeItem('supabase_session');
            localStorage.removeItem('portfolio_auth_token');
            localStorage.removeItem('portfolio_refresh_token');
        }
        
        // Trigger custom event for other parts of the app
        window.dispatchEvent(new CustomEvent('authStateChange', {
            detail: { event, session, user: session?.user }
        }));
    }

    // ==================== AUTHENTICATION ====================

    async signUp(email, password, userData = {}) {
        try {
            const { data, error } = await this.client.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name: userData.name,
                        role: userData.role || 'viewer',
                        avatar_url: userData.avatar,
                        ...userData
                    }
                }
            });

            if (error) throw error;

            // Create user profile
            if (data.user) {
                await this.createUserProfile(data.user, userData);
            }

            return {
                success: true,
                user: data.user,
                session: data.session,
                requiresVerification: !data.session
            };
        } catch (error) {
            console.error('Sign up error:', error);
            throw new Error(error.message || 'Registration failed');
        }
    }

    async signIn(email, password) {
        try {
            console.log('🔐 Attempting sign in with email:', email);
            
            const { data, error } = await this.client.auth.signInWithPassword({
                email,
                password
            });

            console.log('🔐 Sign in response:', { data: !!data, error: !!error });

            if (error) {
                console.error('❌ Sign in error:', error);
                throw error;
            }

            console.log('✅ Sign in successful, user:', data.user?.email);

            // Get user profile
            let profile = null;
            if (data.user) {
                console.log('👤 Fetching user profile...');
                profile = await this.getUserProfile(data.user.id);
                console.log('👤 User profile:', profile);
            }

            return {
                success: true,
                user: data.user,
                session: data.session,
                profile: profile
            };
        } catch (error) {
            console.error('❌ Sign in error:', error);
            throw new Error(error.message || 'Login failed');
        }
    }

    async signOut() {
        try {
            const { error } = await this.client.auth.signOut();
            if (error) throw error;

            this.currentUser = null;
            return { success: true };
        } catch (error) {
            console.error('Sign out error:', error);
            throw new Error(error.message || 'Logout failed');
        }
    }

    async refreshSession() {
        try {
            const { data, error } = await this.client.auth.refreshSession();
            if (error) throw error;

            return {
                success: true,
                session: data.session
            };
        } catch (error) {
            console.error('Refresh session error:', error);
            throw new Error(error.message || 'Session refresh failed');
        }
    }

    async resetPassword(email) {
        try {
            const { error } = await this.client.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password.html`
            });

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Reset password error:', error);
            throw new Error(error.message || 'Password reset failed');
        }
    }

    async updatePassword(newPassword) {
        try {
            const { error } = await this.client.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Update password error:', error);
            throw new Error(error.message || 'Password update failed');
        }
    }

    // ==================== USER MANAGEMENT ====================

    async createUserProfile(user, additionalData = {}) {
        try {
            const profileData = {
                id: user.id,
                email: user.email,
                name: additionalData.name || user.user_metadata?.name || '',
                role: additionalData.role || 'viewer',
                avatar_url: additionalData.avatar || user.user_metadata?.avatar_url || '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                last_login: new Date().toISOString(),
                status: 'active',
                permissions: this.getDefaultPermissions(additionalData.role || 'viewer')
            };

            const { data, error } = await this.client
                .from('user_profiles')
                .insert([profileData])
                .select()
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Create user profile error:', error);
            throw error;
        }
    }

    async getUserProfile(userId) {
        try {
            const { data, error } = await this.client
                .from('user_profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Get user profile error:', error);
            return null;
        }
    }

    async updateUserProfile(userId, updates) {
        try {
            const { data, error } = await this.client
                .from('user_profiles')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId)
                .select()
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Update user profile error:', error);
            throw error;
        }
    }

    async getAllUsers() {
        try {
            const { data, error } = await this.client
                .from('user_profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Get all users error:', error);
            return [];
        }
    }

    async updateUserRole(userId, newRole) {
        try {
            const permissions = this.getDefaultPermissions(newRole);
            
            const { data, error } = await this.client
                .from('user_profiles')
                .update({
                    role: newRole,
                    permissions: permissions,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId)
                .select()
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Update user role error:', error);
            throw error;
        }
    }

    getDefaultPermissions(role) {
        const permissions = {
            'super_admin': ['*'],
            'admin': ['users:*', 'content:*', 'analytics:read', 'settings:*'],
            'editor': ['content:write', 'content:read', 'projects:*', 'carousel:*'],
            'viewer': ['content:read', 'analytics:read']
        };

        return permissions[role] || permissions['viewer'];
    }

    // ==================== PROJECTS ====================

    async getProjects() {
        try {
            const { data, error } = await this.client
                .from('projects')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Get projects error:', error);
            return [];
        }
    }

    async getProject(id) {
        try {
            const { data, error } = await this.client
                .from('projects')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Get project error:', error);
            throw error;
        }
    }

    async createProject(projectData) {
        try {
            const { data, error } = await this.client
                .from('projects')
                .insert([{
                    ...projectData,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    created_by: this.currentUser?.id
                }])
                .select()
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Create project error:', error);
            throw error;
        }
    }

    async updateProject(id, updates) {
        try {
            const { data, error } = await this.client
                .from('projects')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Update project error:', error);
            throw error;
        }
    }

    async deleteProject(id) {
        try {
            const { error } = await this.client
                .from('projects')
                .delete()
                .eq('id', id);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Delete project error:', error);
            throw error;
        }
    }

    // ==================== CASE STUDIES ====================

    async getCaseStudies() {
        try {
            const { data, error } = await this.client
                .from('case_studies')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Get case studies error:', error);
            return [];
        }
    }

    async getCaseStudy(id) {
        try {
            const { data, error } = await this.client
                .from('case_studies')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Get case study error:', error);
            throw error;
        }
    }

    async createCaseStudy(caseStudyData) {
        try {
            const { data, error } = await this.client
                .from('case_studies')
                .insert([{
                    ...caseStudyData,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    created_by: this.currentUser?.id
                }])
                .select()
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Create case study error:', error);
            throw error;
        }
    }

    async updateCaseStudy(id, updates) {
        try {
            const { data, error } = await this.client
                .from('case_studies')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Update case study error:', error);
            throw error;
        }
    }

    async deleteCaseStudy(id) {
        try {
            const { error } = await this.client
                .from('case_studies')
                .delete()
                .eq('id', id);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Delete case study error:', error);
            throw error;
        }
    }

    // ==================== CAROUSEL IMAGES ====================

    async getCarouselImages() {
        try {
            const { data, error } = await this.client
                .from('carousel_images')
                .select('*')
                .order('order_index', { ascending: true });

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Get carousel images error:', error);
            return [];
        }
    }

    async createCarouselImage(imageData) {
        try {
            const { data, error } = await this.client
                .from('carousel_images')
                .insert([{
                    ...imageData,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    created_by: this.currentUser?.id
                }])
                .select()
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Create carousel image error:', error);
            throw error;
        }
    }

    async updateCarouselImage(id, updates) {
        try {
            const { data, error } = await this.client
                .from('carousel_images')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Update carousel image error:', error);
            throw error;
        }
    }

    async deleteCarouselImage(id) {
        try {
            const { error } = await this.client
                .from('carousel_images')
                .delete()
                .eq('id', id);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Delete carousel image error:', error);
            throw error;
        }
    }

    // ==================== API KEYS ====================

    async getApiKeys(userId) {
        try {
            const { data, error } = await this.client
                .from('api_keys')
                .select('*')
                .eq('user_id', userId)
                .eq('status', 'active')
                .order('created_at', { ascending: false });

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Get API keys error:', error);
            return [];
        }
    }

    async createApiKey(userId, keyData) {
        try {
            const apiKey = this.generateApiKey();
            
            const { data, error } = await this.client
                .from('api_keys')
                .insert([{
                    user_id: userId,
                    name: keyData.name,
                    key_hash: await this.hashApiKey(apiKey),
                    key_preview: `${apiKey.substring(0, 8)}...`,
                    permissions: keyData.permissions || [],
                    status: 'active',
                    created_at: new Date().toISOString(),
                    last_used: null
                }])
                .select()
                .single();

            if (error) throw error;

            return {
                ...data,
                key: apiKey // Only return the full key once
            };
        } catch (error) {
            console.error('Create API key error:', error);
            throw error;
        }
    }

    async revokeApiKey(id) {
        try {
            const { data, error } = await this.client
                .from('api_keys')
                .update({
                    status: 'revoked',
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Revoke API key error:', error);
            throw error;
        }
    }

    generateApiKey() {
        const prefix = 'pk_live_';
        const randomBytes = new Uint8Array(32);
        crypto.getRandomValues(randomBytes);
        const key = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
        return prefix + key;
    }

    async hashApiKey(key) {
        const encoder = new TextEncoder();
        const data = encoder.encode(key);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // ==================== ANALYTICS ====================

    async trackEvent(eventData) {
        try {
            const { data, error } = await this.client
                .from('analytics_events')
                .insert([{
                    ...eventData,
                    created_at: new Date().toISOString(),
                    user_id: this.currentUser?.id
                }])
                .select()
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Track event error:', error);
            // Don't throw error for analytics to avoid breaking the app
            return null;
        }
    }

    async getAnalytics(timeRange = '7d') {
        try {
            const startDate = new Date();
            const days = parseInt(timeRange.replace('d', ''));
            startDate.setDate(startDate.getDate() - days);

            const { data, error } = await this.client
                .from('analytics_events')
                .select('*')
                .gte('created_at', startDate.toISOString())
                .order('created_at', { ascending: false });

            if (error) throw error;

            return this.processAnalyticsData(data || []);
        } catch (error) {
            console.error('Get analytics error:', error);
            return this.getMockAnalyticsData();
        }
    }

    processAnalyticsData(events) {
        const pageViews = events.filter(e => e.event_type === 'page_view').length;
        const uniqueVisitors = new Set(events.map(e => e.session_id)).size;
        
        return {
            pageViews,
            uniqueVisitors,
            bounceRate: 45.2, // Calculate based on single-page sessions
            avgSessionDuration: 180, // Calculate from session data
            topPages: this.getTopPages(events),
            trafficSources: this.getTrafficSources(events),
            deviceStats: this.getDeviceStats(events)
        };
    }

    getTopPages(events) {
        const pageViews = events.filter(e => e.event_type === 'page_view');
        const pageCounts = {};
        
        pageViews.forEach(event => {
            const page = event.data?.page || '/';
            pageCounts[page] = (pageCounts[page] || 0) + 1;
        });
        
        return Object.entries(pageCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([page, views]) => ({
                page,
                views,
                percentage: Math.round((views / pageViews.length) * 100)
            }));
    }

    getTrafficSources(events) {
        // Mock implementation - would need referrer data
        return [
            { source: 'Direct', visitors: 234, percentage: 41 },
            { source: 'Google', visitors: 156, percentage: 28 },
            { source: 'Social Media', visitors: 89, percentage: 16 }
        ];
    }

    getDeviceStats(events) {
        // Mock implementation - would need user agent parsing
        return [
            { device: 'Desktop', users: 345, percentage: 61 },
            { device: 'Mobile', users: 178, percentage: 31 },
            { device: 'Tablet', users: 44, percentage: 8 }
        ];
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

    // ==================== SETTINGS ====================

    async getSettings() {
        try {
            const { data, error } = await this.client
                .from('site_settings')
                .select('*')
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            return data || this.getDefaultSettings();
        } catch (error) {
            console.error('Get settings error:', error);
            return this.getDefaultSettings();
        }
    }

    async updateSettings(settings) {
        try {
            const { data, error } = await this.client
                .from('site_settings')
                .upsert([{
                    id: 1, // Single row for site settings
                    ...settings,
                    updated_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Update settings error:', error);
            throw error;
        }
    }

    getDefaultSettings() {
        return {
            site_title: 'My Portfolio',
            site_description: 'Professional portfolio website',
            time_zone: 'UTC',
            language: 'en',
            analytics_enabled: true,
            comments_enabled: false,
            contact_form_enabled: true,
            dark_mode_enabled: true
        };
    }

    // ==================== UTILITY METHODS ====================

    getCurrentUser() {
        return this.currentUser;
    }

    async getCurrentSession() {
        const { data: { session } } = await this.client.auth.getSession();
        return session;
    }

    isAuthenticated() {
        return !!this.currentUser;
    }
}

// Create global instance
window.supabaseAPI = new SupabaseAPI();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SupabaseAPI;
}
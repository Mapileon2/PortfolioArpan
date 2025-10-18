/**
 * Standardized Data Hooks
 * 
 * Provides consistent hooks for all data operations across the SaaS system
 * Eliminates duplicate API calls and standardizes data access patterns
 * 
 * Requirements: 5.2
 */

class StandardizedHooks {
    constructor(apiConsolidator) {
        this.api = apiConsolidator || window.apiConsolidator;
        this.hooks = new Map();
        this.subscribers = new Map();
        
        console.log('🪝 Standardized Hooks initialized');
    }

    // ==================== CASE STUDY HOOKS ====================

    /**
     * Hook for fetching a single case study with caching and loading states
     */
    useFetchCaseStudy(id, options = {}) {
        const hookKey = `fetchCaseStudy:${id}`;
        
        if (this.hooks.has(hookKey)) {
            return this.hooks.get(hookKey);
        }

        const hook = {
            data: null,
            loading: false,
            error: null,
            lastFetch: null,
            
            async execute(forceRefresh = false) {
                // Check if we need to refresh
                if (!forceRefresh && this.data && this.lastFetch) {
                    const age = Date.now() - this.lastFetch;
                    if (age < 60000) { // 1 minute cache
                        console.log('✅ Using cached case study data:', id);
                        return { success: true, data: this.data };
                    }
                }

                this.loading = true;
                this.error = null;
                this.notifySubscribers('loading', true);
                
                try {
                    console.log('🔄 Fetching case study:', id);
                    
                    const result = await this.api.makeRequest(`/case-studies/${id}`, {
                        enableCache: !forceRefresh,
                        ...options
                    });
                    
                    if (result.success) {
                        this.data = result.data;
                        this.lastFetch = Date.now();
                        this.notifySubscribers('data', this.data);
                        console.log('✅ Case study fetched successfully:', id);
                    } else {
                        this.error = result.error;
                        this.notifySubscribers('error', this.error);
                    }
                    
                    return result;
                } catch (error) {
                    this.error = error;
                    this.notifySubscribers('error', error);
                    throw error;
                } finally {
                    this.loading = false;
                    this.notifySubscribers('loading', false);
                }
            },

            async refresh() {
                return await this.execute(true);
            },

            subscribe(callback) {
                const hookKey = `fetchCaseStudy:${id}`;
                if (!window.standardizedHooks.subscribers.has(hookKey)) {
                    window.standardizedHooks.subscribers.set(hookKey, new Set());
                }
                window.standardizedHooks.subscribers.get(hookKey).add(callback);
                
                // Return unsubscribe function
                return () => {
                    const subscribers = window.standardizedHooks.subscribers.get(hookKey);
                    if (subscribers) {
                        subscribers.delete(callback);
                    }
                };
            },

            notifySubscribers(type, value) {
                const hookKey = `fetchCaseStudy:${id}`;
                const subscribers = window.standardizedHooks.subscribers.get(hookKey);
                if (subscribers) {
                    subscribers.forEach(callback => {
                        try {
                            callback({ type, value, hookKey });
                        } catch (error) {
                            console.error('❌ Hook subscriber error:', error);
                        }
                    });
                }
            }
        };

        this.hooks.set(hookKey, hook);
        return hook;
    }

    /**
     * Hook for creating case studies with validation and error handling
     */
    useCreateCaseStudy(options = {}) {
        const hookKey = 'createCaseStudy';
        
        if (this.hooks.has(hookKey)) {
            return this.hooks.get(hookKey);
        }

        const hook = {
            loading: false,
            error: null,
            lastCreated: null,
            
            async execute(caseStudyData) {
                this.loading = true;
                this.error = null;
                this.notifySubscribers('loading', true);
                
                try {
                    console.log('🔄 Creating case study...');
                    
                    // Validate required fields
                    const validation = this.validateCaseStudyData(caseStudyData);
                    if (!validation.isValid) {
                        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
                    }
                    
                    const result = await this.api.makeRequest('/case-studies', {
                        method: 'POST',
                        body: caseStudyData,
                        enableCache: false,
                        ...options
                    });
                    
                    if (result.success) {
                        this.lastCreated = result.data;
                        this.notifySubscribers('created', result.data);
                        
                        // Invalidate case studies list cache
                        this.api.clearCachePattern('/case-studies');
                        
                        console.log('✅ Case study created successfully:', result.data.id);
                    } else {
                        this.error = result.error;
                        this.notifySubscribers('error', this.error);
                    }
                    
                    return result;
                } catch (error) {
                    this.error = error;
                    this.notifySubscribers('error', error);
                    throw error;
                } finally {
                    this.loading = false;
                    this.notifySubscribers('loading', false);
                }
            },

            validateCaseStudyData(data) {
                const errors = [];
                
                if (!data.project_title || data.project_title.trim() === '') {
                    errors.push('Project title is required');
                }
                
                if (data.project_rating && (data.project_rating < 1 || data.project_rating > 5)) {
                    errors.push('Project rating must be between 1 and 5');
                }
                
                return {
                    isValid: errors.length === 0,
                    errors
                };
            },

            subscribe(callback) {
                const hookKey = 'createCaseStudy';
                if (!window.standardizedHooks.subscribers.has(hookKey)) {
                    window.standardizedHooks.subscribers.set(hookKey, new Set());
                }
                window.standardizedHooks.subscribers.get(hookKey).add(callback);
                
                return () => {
                    const subscribers = window.standardizedHooks.subscribers.get(hookKey);
                    if (subscribers) {
                        subscribers.delete(callback);
                    }
                };
            },

            notifySubscribers(type, value) {
                const hookKey = 'createCaseStudy';
                const subscribers = window.standardizedHooks.subscribers.get(hookKey);
                if (subscribers) {
                    subscribers.forEach(callback => {
                        try {
                            callback({ type, value, hookKey });
                        } catch (error) {
                            console.error('❌ Hook subscriber error:', error);
                        }
                    });
                }
            }
        };

        this.hooks.set(hookKey, hook);
        return hook;
    }

    /**
     * Hook for updating case studies with optimistic updates
     */
    useUpdateCaseStudy(options = {}) {
        const hookKey = 'updateCaseStudy';
        
        if (this.hooks.has(hookKey)) {
            return this.hooks.get(hookKey);
        }

        const hook = {
            loading: false,
            error: null,
            lastUpdated: null,
            
            async execute(id, updates, enableOptimistic = true) {
                this.loading = true;
                this.error = null;
                this.notifySubscribers('loading', true);
                
                // Optimistic update
                let originalData = null;
                if (enableOptimistic) {
                    const fetchHook = window.standardizedHooks.useFetchCaseStudy(id);
                    if (fetchHook.data) {
                        originalData = { ...fetchHook.data };
                        fetchHook.data = { ...fetchHook.data, ...updates };
                        fetchHook.notifySubscribers('data', fetchHook.data);
                    }
                }
                
                try {
                    console.log('🔄 Updating case study:', id);
                    
                    const result = await this.api.makeRequest(`/case-studies/${id}`, {
                        method: 'PUT',
                        body: updates,
                        enableCache: false,
                        ...options
                    });
                    
                    if (result.success) {
                        this.lastUpdated = result.data;
                        this.notifySubscribers('updated', result.data);
                        
                        // Update the fetch hook with real data
                        const fetchHook = window.standardizedHooks.useFetchCaseStudy(id);
                        if (fetchHook) {
                            fetchHook.data = result.data;
                            fetchHook.lastFetch = Date.now();
                            fetchHook.notifySubscribers('data', result.data);
                        }
                        
                        // Invalidate related caches
                        this.api.clearCachePattern(`/case-studies/${id}`);
                        this.api.clearCachePattern('/case-studies');
                        
                        console.log('✅ Case study updated successfully:', id);
                    } else {
                        this.error = result.error;
                        this.notifySubscribers('error', this.error);
                        
                        // Revert optimistic update
                        if (enableOptimistic && originalData) {
                            const fetchHook = window.standardizedHooks.useFetchCaseStudy(id);
                            if (fetchHook) {
                                fetchHook.data = originalData;
                                fetchHook.notifySubscribers('data', originalData);
                            }
                        }
                    }
                    
                    return result;
                } catch (error) {
                    this.error = error;
                    this.notifySubscribers('error', error);
                    
                    // Revert optimistic update
                    if (enableOptimistic && originalData) {
                        const fetchHook = window.standardizedHooks.useFetchCaseStudy(id);
                        if (fetchHook) {
                            fetchHook.data = originalData;
                            fetchHook.notifySubscribers('data', originalData);
                        }
                    }
                    
                    throw error;
                } finally {
                    this.loading = false;
                    this.notifySubscribers('loading', false);
                }
            },

            subscribe(callback) {
                const hookKey = 'updateCaseStudy';
                if (!window.standardizedHooks.subscribers.has(hookKey)) {
                    window.standardizedHooks.subscribers.set(hookKey, new Set());
                }
                window.standardizedHooks.subscribers.get(hookKey).add(callback);
                
                return () => {
                    const subscribers = window.standardizedHooks.subscribers.get(hookKey);
                    if (subscribers) {
                        subscribers.delete(callback);
                    }
                };
            },

            notifySubscribers(type, value) {
                const hookKey = 'updateCaseStudy';
                const subscribers = window.standardizedHooks.subscribers.get(hookKey);
                if (subscribers) {
                    subscribers.forEach(callback => {
                        try {
                            callback({ type, value, hookKey });
                        } catch (error) {
                            console.error('❌ Hook subscriber error:', error);
                        }
                    });
                }
            }
        };

        this.hooks.set(hookKey, hook);
        return hook;
    }

    /**
     * Hook for deleting case studies with confirmation
     */
    useDeleteCaseStudy(options = {}) {
        const hookKey = 'deleteCaseStudy';
        
        if (this.hooks.has(hookKey)) {
            return this.hooks.get(hookKey);
        }

        const hook = {
            loading: false,
            error: null,
            lastDeleted: null,
            
            async execute(id, confirmDelete = false) {
                if (!confirmDelete) {
                    throw new Error('Delete confirmation required');
                }

                this.loading = true;
                this.error = null;
                this.notifySubscribers('loading', true);
                
                try {
                    console.log('🗑️ Deleting case study:', id);
                    
                    const result = await this.api.makeRequest(`/case-studies/${id}`, {
                        method: 'DELETE',
                        enableCache: false,
                        ...options
                    });
                    
                    if (result.success) {
                        this.lastDeleted = { id, deletedAt: new Date().toISOString() };
                        this.notifySubscribers('deleted', this.lastDeleted);
                        
                        // Remove from fetch hook cache
                        const fetchHook = window.standardizedHooks.hooks.get(`fetchCaseStudy:${id}`);
                        if (fetchHook) {
                            fetchHook.data = null;
                            fetchHook.error = { code: 'NOT_FOUND', message: 'Case study was deleted' };
                            fetchHook.notifySubscribers('deleted', id);
                        }
                        
                        // Invalidate related caches
                        this.api.clearCachePattern(`/case-studies/${id}`);
                        this.api.clearCachePattern('/case-studies');
                        
                        console.log('✅ Case study deleted successfully:', id);
                    } else {
                        this.error = result.error;
                        this.notifySubscribers('error', this.error);
                    }
                    
                    return result;
                } catch (error) {
                    this.error = error;
                    this.notifySubscribers('error', error);
                    throw error;
                } finally {
                    this.loading = false;
                    this.notifySubscribers('loading', false);
                }
            },

            subscribe(callback) {
                const hookKey = 'deleteCaseStudy';
                if (!window.standardizedHooks.subscribers.has(hookKey)) {
                    window.standardizedHooks.subscribers.set(hookKey, new Set());
                }
                window.standardizedHooks.subscribers.get(hookKey).add(callback);
                
                return () => {
                    const subscribers = window.standardizedHooks.subscribers.get(hookKey);
                    if (subscribers) {
                        subscribers.delete(callback);
                    }
                };
            },

            notifySubscribers(type, value) {
                const hookKey = 'deleteCaseStudy';
                const subscribers = window.standardizedHooks.subscribers.get(hookKey);
                if (subscribers) {
                    subscribers.forEach(callback => {
                        try {
                            callback({ type, value, hookKey });
                        } catch (error) {
                            console.error('❌ Hook subscriber error:', error);
                        }
                    });
                }
            }
        };

        this.hooks.set(hookKey, hook);
        return hook;
    }

    /**
     * Hook for fetching case studies list with filtering and pagination
     */
    useFetchCaseStudies(options = {}) {
        const {
            filter = {},
            sort = { field: 'created_at', direction: 'desc' },
            limit = null,
            offset = 0
        } = options;
        
        const hookKey = `fetchCaseStudies:${JSON.stringify({ filter, sort, limit, offset })}`;
        
        if (this.hooks.has(hookKey)) {
            return this.hooks.get(hookKey);
        }

        const hook = {
            data: [],
            loading: false,
            error: null,
            lastFetch: null,
            hasMore: true,
            
            async execute(forceRefresh = false) {
                // Check cache
                if (!forceRefresh && this.data.length > 0 && this.lastFetch) {
                    const age = Date.now() - this.lastFetch;
                    if (age < 30000) { // 30 seconds cache for lists
                        console.log('✅ Using cached case studies list');
                        return { success: true, data: this.data };
                    }
                }

                this.loading = true;
                this.error = null;
                this.notifySubscribers('loading', true);
                
                try {
                    console.log('🔄 Fetching case studies list...');
                    
                    // Build query parameters
                    const queryParams = new URLSearchParams();
                    if (filter.status) queryParams.append('status', filter.status);
                    if (filter.category) queryParams.append('category', filter.category);
                    if (sort.field) queryParams.append('sort', `${sort.field}:${sort.direction}`);
                    if (limit) queryParams.append('limit', limit);
                    if (offset) queryParams.append('offset', offset);
                    
                    const endpoint = `/case-studies${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
                    
                    const result = await this.api.makeRequest(endpoint, {
                        enableCache: !forceRefresh,
                        ...options
                    });
                    
                    if (result.success) {
                        this.data = result.data || [];
                        this.lastFetch = Date.now();
                        this.hasMore = result.metadata?.hasMore || false;
                        this.notifySubscribers('data', this.data);
                        console.log(`✅ Case studies list fetched: ${this.data.length} items`);
                    } else {
                        this.error = result.error;
                        this.notifySubscribers('error', this.error);
                    }
                    
                    return result;
                } catch (error) {
                    this.error = error;
                    this.notifySubscribers('error', error);
                    throw error;
                } finally {
                    this.loading = false;
                    this.notifySubscribers('loading', false);
                }
            },

            async loadMore() {
                if (!this.hasMore || this.loading) {
                    return { success: true, data: [] };
                }

                const moreOptions = {
                    ...options,
                    offset: this.data.length
                };

                const moreHook = window.standardizedHooks.useFetchCaseStudies(moreOptions);
                const result = await moreHook.execute();

                if (result.success && result.data) {
                    this.data = [...this.data, ...result.data];
                    this.hasMore = result.metadata?.hasMore || false;
                    this.notifySubscribers('data', this.data);
                }

                return result;
            },

            async refresh() {
                return await this.execute(true);
            },

            subscribe(callback) {
                if (!window.standardizedHooks.subscribers.has(hookKey)) {
                    window.standardizedHooks.subscribers.set(hookKey, new Set());
                }
                window.standardizedHooks.subscribers.get(hookKey).add(callback);
                
                return () => {
                    const subscribers = window.standardizedHooks.subscribers.get(hookKey);
                    if (subscribers) {
                        subscribers.delete(callback);
                    }
                };
            },

            notifySubscribers(type, value) {
                const subscribers = window.standardizedHooks.subscribers.get(hookKey);
                if (subscribers) {
                    subscribers.forEach(callback => {
                        try {
                            callback({ type, value, hookKey });
                        } catch (error) {
                            console.error('❌ Hook subscriber error:', error);
                        }
                    });
                }
            }
        };

        this.hooks.set(hookKey, hook);
        return hook;
    }

    // ==================== IMAGE HOOKS ====================

    /**
     * Hook for uploading images with progress tracking
     */
    useUploadImage(options = {}) {
        const hookKey = 'uploadImage';
        
        if (this.hooks.has(hookKey)) {
            return this.hooks.get(hookKey);
        }

        const hook = {
            loading: false,
            error: null,
            progress: 0,
            lastUploaded: null,
            
            async execute(file, uploadOptions = {}) {
                this.loading = true;
                this.error = null;
                this.progress = 0;
                this.notifySubscribers('loading', true);
                this.notifySubscribers('progress', 0);
                
                try {
                    console.log('🔄 Uploading image:', file.name);
                    
                    const result = await this.api.uploadImage(file, {
                        ...options,
                        ...uploadOptions,
                        onProgress: (progress) => {
                            this.progress = progress;
                            this.notifySubscribers('progress', progress);
                        }
                    });
                    
                    if (result.success) {
                        this.lastUploaded = result.data;
                        this.progress = 100;
                        this.notifySubscribers('uploaded', result.data);
                        this.notifySubscribers('progress', 100);
                        console.log('✅ Image uploaded successfully:', result.data.id);
                    } else {
                        this.error = result.error;
                        this.notifySubscribers('error', this.error);
                    }
                    
                    return result;
                } catch (error) {
                    this.error = error;
                    this.notifySubscribers('error', error);
                    throw error;
                } finally {
                    this.loading = false;
                    this.notifySubscribers('loading', false);
                }
            },

            subscribe(callback) {
                const hookKey = 'uploadImage';
                if (!window.standardizedHooks.subscribers.has(hookKey)) {
                    window.standardizedHooks.subscribers.set(hookKey, new Set());
                }
                window.standardizedHooks.subscribers.get(hookKey).add(callback);
                
                return () => {
                    const subscribers = window.standardizedHooks.subscribers.get(hookKey);
                    if (subscribers) {
                        subscribers.delete(callback);
                    }
                };
            },

            notifySubscribers(type, value) {
                const hookKey = 'uploadImage';
                const subscribers = window.standardizedHooks.subscribers.get(hookKey);
                if (subscribers) {
                    subscribers.forEach(callback => {
                        try {
                            callback({ type, value, hookKey });
                        } catch (error) {
                            console.error('❌ Hook subscriber error:', error);
                        }
                    });
                }
            }
        };

        this.hooks.set(hookKey, hook);
        return hook;
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Get hook by key
     */
    getHook(key) {
        return this.hooks.get(key);
    }

    /**
     * Remove hook and its subscribers
     */
    removeHook(key) {
        this.hooks.delete(key);
        this.subscribers.delete(key);
        return true;
    }

    /**
     * Clear all hooks and subscribers
     */
    clearAll() {
        this.hooks.clear();
        this.subscribers.clear();
        console.log('✅ All hooks cleared');
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            hooks: this.hooks.size,
            subscribers: this.subscribers.size,
            hookKeys: Array.from(this.hooks.keys()),
            subscriberKeys: Array.from(this.subscribers.keys())
        };
    }
}

// Auto-initialize
if (typeof window !== 'undefined') {
    // Wait for API consolidator to be ready
    const initHooks = () => {
        if (window.apiConsolidator) {
            window.standardizedHooks = new StandardizedHooks(window.apiConsolidator);
            console.log('✅ Standardized Hooks auto-initialized');
        } else {
            setTimeout(initHooks, 100);
        }
    };
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHooks);
    } else {
        initHooks();
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StandardizedHooks;
}
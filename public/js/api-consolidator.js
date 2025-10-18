/**
 * API Consolidator Module
 * 
 * Consolidates and standardizes API logic across the SaaS system
 * Addresses critical issues identified in the audit:
 * - 6 duplicate Cloudinary upload calls
 * - Missing hook standardization  
 * - Inconsistent API patterns and error handling
 * - Redundant Supabase queries and API endpoints
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 */

class APIConsolidator {
    constructor() {
        this.baseURL = window.location.origin;
        this.apiURL = `${this.baseURL}/api`;
        this.hooks = new Map();
        this.cache = new Map();
        this.requestQueue = new Map();
        
        // Configuration
        this.config = {
            timeout: 30000, // 30 seconds
            retryAttempts: 3,
            retryDelay: 1000,
            cacheExpiry: 300000, // 5 minutes
            enableCache: true,
            enableDeduplication: true
        };
        
        this.init();
    }

    async init() {
        console.log('🔗 Initializing API Consolidator...');
        
        // Setup standardized error handling
        this.setupErrorHandling();
        
        // Initialize authentication
        this.setupAuthentication();
        
        // Setup request interceptors
        this.setupInterceptors();
        
        console.log('✅ API Consolidator ready');
    }

    /**
     * Setup standardized error handling
     */
    setupErrorHandling() {
        this.errorHandler = {
            // Standardized error response format
            formatError: (error, context = {}) => {
                return {
                    success: false,
                    error: {
                        code: error.code || 'UNKNOWN_ERROR',
                        message: error.message || 'An unexpected error occurred',
                        details: error.details || null,
                        context: context,
                        timestamp: new Date().toISOString(),
                        retryable: this.isRetryableError(error)
                    }
                };
            },

            // Check if error should be retried
            isRetryable: (error) => {
                const retryableCodes = [
                    'NETWORK_ERROR',
                    'TIMEOUT_ERROR',
                    'SERVER_ERROR',
                    'RATE_LIMITED'
                ];
                return retryableCodes.includes(error.code) || 
                       (error.status >= 500 && error.status < 600);
            },

            // Get user-friendly error message
            getUserMessage: (error) => {
                const userMessages = {
                    'NETWORK_ERROR': 'Network connection issue. Please check your internet connection.',
                    'TIMEOUT_ERROR': 'Request timed out. Please try again.',
                    'VALIDATION_ERROR': 'Please check your input and try again.',
                    'AUTHENTICATION_ERROR': 'Please log in to continue.',
                    'PERMISSION_ERROR': 'You do not have permission to perform this action.',
                    'NOT_FOUND': 'The requested item was not found.',
                    'RATE_LIMITED': 'Too many requests. Please wait a moment and try again.',
                    'SERVER_ERROR': 'Server error. Please try again later.'
                };
                
                return userMessages[error.code] || error.message || 'An unexpected error occurred';
            }
        };
    }

    /**
     * Setup authentication handling
     */
    setupAuthentication() {
        this.auth = {
            getToken: () => {
                return localStorage.getItem('portfolio_auth_token') || 
                       localStorage.getItem('accessToken');
            },

            getHeaders: () => {
                const token = this.auth.getToken();
                const headers = {
                    'Content-Type': 'application/json'
                };
                
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
                
                return headers;
            },

            isAuthenticated: () => {
                return !!this.auth.getToken();
            }
        };
    }

    /**
     * Setup request interceptors for deduplication and caching
     */
    setupInterceptors() {
        this.interceptors = {
            // Request deduplication
            deduplicateRequest: async (key, requestFn) => {
                if (this.config.enableDeduplication && this.requestQueue.has(key)) {
                    console.log('🔄 Deduplicating request:', key);
                    return await this.requestQueue.get(key);
                }
                
                const promise = requestFn();
                this.requestQueue.set(key, promise);
                
                try {
                    const result = await promise;
                    return result;
                } finally {
                    this.requestQueue.delete(key);
                }
            },

            // Response caching
            cacheResponse: (key, response) => {
                if (this.config.enableCache && response.success) {
                    this.cache.set(key, {
                        data: response,
                        timestamp: Date.now()
                    });
                }
            },

            // Cache retrieval
            getCachedResponse: (key) => {
                if (!this.config.enableCache) return null;
                
                const cached = this.cache.get(key);
                if (!cached) return null;
                
                const age = Date.now() - cached.timestamp;
                if (age > this.config.cacheExpiry) {
                    this.cache.delete(key);
                    return null;
                }
                
                console.log('✅ Using cached response:', key);
                return cached.data;
            }
        };
    }

    /**
     * Standardized HTTP request method with retry logic and error handling
     */
    async makeRequest(endpoint, options = {}) {
        const {
            method = 'GET',
            body = null,
            headers = {},
            timeout = this.config.timeout,
            enableRetry = true,
            enableCache = this.config.enableCache,
            cacheKey = null
        } = options;

        const url = endpoint.startsWith('http') ? endpoint : `${this.apiURL}${endpoint}`;
        const requestKey = cacheKey || `${method}:${url}:${JSON.stringify(body)}`;

        // Check cache first for GET requests
        if (method === 'GET' && enableCache) {
            const cached = this.interceptors.getCachedResponse(requestKey);
            if (cached) return cached;
        }

        // Deduplicate identical requests
        return await this.interceptors.deduplicateRequest(requestKey, async () => {
            const maxAttempts = enableRetry ? this.config.retryAttempts : 1;
            let lastError;

            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    console.log(`🔄 API request attempt ${attempt}/${maxAttempts}: ${method} ${endpoint}`);

                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), timeout);

                    const response = await fetch(url, {
                        method,
                        headers: {
                            ...this.auth.getHeaders(),
                            ...headers
                        },
                        body: body ? JSON.stringify(body) : null,
                        signal: controller.signal
                    });

                    clearTimeout(timeoutId);

                    let data;
                    try {
                        data = await response.json();
                    } catch (parseError) {
                        data = { message: 'Invalid JSON response' };
                    }

                    if (!response.ok) {
                        const error = new Error(data.message || `HTTP ${response.status}`);
                        error.code = this.getErrorCode(response.status, data);
                        error.status = response.status;
                        error.details = data;
                        throw error;
                    }

                    const result = {
                        success: true,
                        data: data.data || data,
                        metadata: {
                            status: response.status,
                            timestamp: new Date().toISOString(),
                            attempt: attempt,
                            cached: false
                        }
                    };

                    // Cache successful GET responses
                    if (method === 'GET' && enableCache) {
                        this.interceptors.cacheResponse(requestKey, result);
                    }

                    console.log('✅ API request successful:', endpoint);
                    return result;

                } catch (error) {
                    lastError = error;
                    console.error(`❌ API request attempt ${attempt} failed:`, error.message);

                    // Don't retry on certain errors
                    if (!this.errorHandler.isRetryable(error) || attempt === maxAttempts) {
                        break;
                    }

                    // Wait before retry
                    await this.delay(this.config.retryDelay * attempt);
                }
            }

            // All attempts failed
            console.error('❌ All API request attempts failed:', endpoint);
            return this.errorHandler.formatError(lastError, { endpoint, method });
        });
    }

    /**
     * Get error code from HTTP status and response data
     */
    getErrorCode(status, data) {
        if (data.code) return data.code;
        
        const statusCodes = {
            400: 'VALIDATION_ERROR',
            401: 'AUTHENTICATION_ERROR',
            403: 'PERMISSION_ERROR',
            404: 'NOT_FOUND',
            409: 'CONFLICT_ERROR',
            429: 'RATE_LIMITED',
            500: 'SERVER_ERROR',
            502: 'BAD_GATEWAY',
            503: 'SERVICE_UNAVAILABLE',
            504: 'GATEWAY_TIMEOUT'
        };
        
        return statusCodes[status] || 'UNKNOWN_ERROR';
    }

    /**
     * Check if error is retryable
     */
    isRetryableError(error) {
        return this.errorHandler.isRetryable(error);
    }

    // ==================== STANDARDIZED HOOKS ====================

    /**
     * Standardized hook for fetching case studies
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
            
            async execute() {
                this.loading = true;
                this.error = null;
                
                try {
                    const result = await window.apiConsolidator.makeRequest(`/case-studies/${id}`, {
                        enableCache: true,
                        ...options
                    });
                    
                    if (result.success) {
                        this.data = result.data;
                    } else {
                        this.error = result.error;
                    }
                    
                    return result;
                } catch (error) {
                    this.error = error;
                    throw error;
                } finally {
                    this.loading = false;
                }
            },

            async refresh() {
                // Clear cache and re-fetch
                const cacheKey = `GET:/api/case-studies/${id}:null`;
                window.apiConsolidator.cache.delete(cacheKey);
                return await this.execute();
            }
        };

        this.hooks.set(hookKey, hook);
        return hook;
    }

    /**
     * Standardized hook for creating case studies
     */
    useCreateCaseStudy(options = {}) {
        const hookKey = 'createCaseStudy';
        
        if (this.hooks.has(hookKey)) {
            return this.hooks.get(hookKey);
        }

        const hook = {
            loading: false,
            error: null,
            
            async execute(caseStudyData) {
                this.loading = true;
                this.error = null;
                
                try {
                    const result = await window.apiConsolidator.makeRequest('/case-studies', {
                        method: 'POST',
                        body: caseStudyData,
                        enableCache: false,
                        ...options
                    });
                    
                    if (!result.success) {
                        this.error = result.error;
                    }
                    
                    return result;
                } catch (error) {
                    this.error = error;
                    throw error;
                } finally {
                    this.loading = false;
                }
            }
        };

        this.hooks.set(hookKey, hook);
        return hook;
    }

    /**
     * Standardized hook for updating case studies
     */
    useUpdateCaseStudy(options = {}) {
        const hookKey = 'updateCaseStudy';
        
        if (this.hooks.has(hookKey)) {
            return this.hooks.get(hookKey);
        }

        const hook = {
            loading: false,
            error: null,
            
            async execute(id, updates) {
                this.loading = true;
                this.error = null;
                
                try {
                    const result = await window.apiConsolidator.makeRequest(`/case-studies/${id}`, {
                        method: 'PUT',
                        body: updates,
                        enableCache: false,
                        ...options
                    });
                    
                    if (!result.success) {
                        this.error = result.error;
                    } else {
                        // Invalidate related cache entries
                        this.invalidateCaseStudyCache(id);
                    }
                    
                    return result;
                } catch (error) {
                    this.error = error;
                    throw error;
                } finally {
                    this.loading = false;
                }
            },

            invalidateCaseStudyCache(id) {
                // Clear specific case study cache
                const specificKey = `GET:/api/case-studies/${id}:null`;
                window.apiConsolidator.cache.delete(specificKey);
                
                // Clear case studies list cache
                const listKey = `GET:/api/case-studies:null`;
                window.apiConsolidator.cache.delete(listKey);
            }
        };

        this.hooks.set(hookKey, hook);
        return hook;
    }

    /**
     * Standardized hook for deleting case studies
     */
    useDeleteCaseStudy(options = {}) {
        const hookKey = 'deleteCaseStudy';
        
        if (this.hooks.has(hookKey)) {
            return this.hooks.get(hookKey);
        }

        const hook = {
            loading: false,
            error: null,
            
            async execute(id) {
                this.loading = true;
                this.error = null;
                
                try {
                    const result = await window.apiConsolidator.makeRequest(`/case-studies/${id}`, {
                        method: 'DELETE',
                        enableCache: false,
                        ...options
                    });
                    
                    if (!result.success) {
                        this.error = result.error;
                    } else {
                        // Invalidate related cache entries
                        this.invalidateCaseStudyCache(id);
                    }
                    
                    return result;
                } catch (error) {
                    this.error = error;
                    throw error;
                } finally {
                    this.loading = false;
                }
            },

            invalidateCaseStudyCache(id) {
                // Clear specific case study cache
                const specificKey = `GET:/api/case-studies/${id}:null`;
                window.apiConsolidator.cache.delete(specificKey);
                
                // Clear case studies list cache
                const listKey = `GET:/api/case-studies:null`;
                window.apiConsolidator.cache.delete(listKey);
            }
        };

        this.hooks.set(hookKey, hook);
        return hook;
    }

    /**
     * Standardized hook for fetching case studies list
     */
    useFetchCaseStudies(options = {}) {
        const hookKey = 'fetchCaseStudies';
        
        if (this.hooks.has(hookKey)) {
            return this.hooks.get(hookKey);
        }

        const hook = {
            data: [],
            loading: false,
            error: null,
            
            async execute() {
                this.loading = true;
                this.error = null;
                
                try {
                    const result = await window.apiConsolidator.makeRequest('/case-studies', {
                        enableCache: true,
                        ...options
                    });
                    
                    if (result.success) {
                        this.data = result.data || [];
                    } else {
                        this.error = result.error;
                    }
                    
                    return result;
                } catch (error) {
                    this.error = error;
                    throw error;
                } finally {
                    this.loading = false;
                }
            },

            async refresh() {
                // Clear cache and re-fetch
                const cacheKey = 'GET:/api/case-studies:null';
                window.apiConsolidator.cache.delete(cacheKey);
                return await this.execute();
            }
        };

        this.hooks.set(hookKey, hook);
        return hook;
    }

    // ==================== CONSOLIDATED CLOUDINARY OPERATIONS ====================

    /**
     * Consolidated image upload (replaces 6 duplicate implementations)
     */
    async uploadImage(file, options = {}) {
        const {
            folder = 'case-studies',
            context = 'case_study',
            referenceId = null,
            transformation = null,
            enableProgress = false,
            onProgress = null
        } = options;

        try {
            console.log('🔄 Consolidated image upload starting...');

            // Use ImageFlowStabilizer if available for enhanced upload
            if (window.imageFlowStabilizer) {
                const result = await window.imageFlowStabilizer.uploadWithValidation(file, {
                    folder,
                    context,
                    referenceId,
                    transformation,
                    originalFilename: file.name
                });

                if (result.success) {
                    console.log('✅ Consolidated upload via ImageFlowStabilizer successful');
                    return {
                        success: true,
                        data: result.data,
                        enhanced: true
                    };
                } else {
                    throw new Error(result.error);
                }
            }

            // Fallback to direct API call
            console.log('⚠️ Using fallback direct upload');
            const formData = new FormData();
            formData.append('image', file);
            formData.append('folder', folder);
            formData.append('context', context);
            if (referenceId) formData.append('referenceId', referenceId);

            const result = await this.makeRequest('/cloudinary/upload', {
                method: 'POST',
                body: formData,
                headers: {}, // Let browser set Content-Type for FormData
                enableCache: false
            });

            console.log('✅ Consolidated upload via API successful');
            return result;

        } catch (error) {
            console.error('❌ Consolidated image upload failed:', error);
            throw error;
        }
    }

    /**
     * Consolidated image deletion (replaces multiple implementations)
     */
    async deleteImage(publicId, options = {}) {
        const {
            cleanupSupabase = true,
            cleanupOrphaned = false
        } = options;

        try {
            console.log('🗑️ Consolidated image deletion starting:', publicId);

            // Use ImageFlowStabilizer if available for enhanced deletion
            if (window.imageFlowStabilizer) {
                const result = await window.imageFlowStabilizer.deleteImage(publicId, {
                    cleanupSupabase,
                    cleanupOrphaned
                });

                console.log('✅ Consolidated deletion via ImageFlowStabilizer successful');
                return {
                    success: true,
                    data: result,
                    enhanced: true
                };
            }

            // Fallback to direct API call
            console.log('⚠️ Using fallback direct deletion');
            const result = await this.makeRequest('/cloudinary/delete', {
                method: 'POST',
                body: { publicId },
                enableCache: false
            });

            console.log('✅ Consolidated deletion via API successful');
            return result;

        } catch (error) {
            console.error('❌ Consolidated image deletion failed:', error);
            throw error;
        }
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Clear all caches
     */
    clearCache() {
        this.cache.clear();
        console.log('✅ API cache cleared');
    }

    /**
     * Clear specific cache entries by pattern
     */
    clearCachePattern(pattern) {
        let cleared = 0;
        for (const [key] of this.cache) {
            if (key.includes(pattern)) {
                this.cache.delete(key);
                cleared++;
            }
        }
        console.log(`✅ Cleared ${cleared} cache entries matching pattern:`, pattern);
    }

    /**
     * Get hook by key
     */
    getHook(key) {
        return this.hooks.get(key);
    }

    /**
     * Remove hook
     */
    removeHook(key) {
        return this.hooks.delete(key);
    }

    /**
     * Delay utility
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get consolidator statistics
     */
    getStats() {
        return {
            hooks: this.hooks.size,
            cache: this.cache.size,
            activeRequests: this.requestQueue.size,
            config: this.config,
            cacheKeys: Array.from(this.cache.keys()),
            hookKeys: Array.from(this.hooks.keys())
        };
    }
}

// Auto-initialize
if (typeof window !== 'undefined') {
    window.apiConsolidator = new APIConsolidator();
    
    // Add backward compatibility helpers
    window.apiConsolidator.createCaseStudy = async function(data) {
        const hook = this.useCreateCaseStudy();
        return await hook.execute(data);
    };
    
    window.apiConsolidator.updateCaseStudy = async function(id, data) {
        const hook = this.useUpdateCaseStudy();
        return await hook.execute(id, data);
    };
    
    window.apiConsolidator.deleteCaseStudy = async function(id) {
        const hook = this.useDeleteCaseStudy();
        return await hook.execute(id);
    };
    
    window.apiConsolidator.getCaseStudy = async function(id) {
        const hook = this.useFetchCaseStudy(id);
        return await hook.execute();
    };
    
    window.apiConsolidator.getCaseStudies = async function() {
        const hook = this.useFetchCaseStudies();
        return await hook.execute();
    };
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIConsolidator;
}
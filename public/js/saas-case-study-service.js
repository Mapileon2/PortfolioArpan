/**
 * SaaS Case Study Service - Frontend API Integration
 * Senior Software Engineer Implementation
 * Complete integration with backend APIs
 */

class SaaSCaseStudyService {
    constructor() {
        this.baseURL = window.location.origin;
        this.apiURL = `${this.baseURL}/api`;
        this.token = localStorage.getItem('accessToken');
        this.refreshToken = localStorage.getItem('refreshToken');
        
        // Setup axios-like request interceptor
        this.setupInterceptors();
    }

    setupInterceptors() {
        // Auto-refresh token on 401 responses
        this.originalFetch = window.fetch;
        window.fetch = async (...args) => {
            let response = await this.originalFetch(...args);
            
            if (response.status === 401 && this.refreshToken) {
                const refreshed = await this.refreshAccessToken();
                if (refreshed) {
                    // Retry original request with new token
                    const [url, options] = args;
                    if (options && options.headers) {
                        options.headers['Authorization'] = `Bearer ${this.token}`;
                    }
                    response = await this.originalFetch(...args);
                }
            }
            
            return response;
        };
    }

    async makeRequest(endpoint, options = {}) {
        const url = `${this.apiURL}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(this.token && { 'Authorization': `Bearer ${this.token}` })
            }
        };

        const finalOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, finalOptions);
            
            // Handle different response types
            let data;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            if (!response.ok) {
                // Enhanced error handling with proper error classification
                const error = new Error(data.error || data.message || `HTTP ${response.status}: ${response.statusText}`);
                error.response = {
                    status: response.status,
                    statusText: response.statusText,
                    data: data
                };
                
                // Map Supabase-specific error codes
                if (data.code) {
                    error.code = this.mapSupabaseErrorCode(data.code);
                } else {
                    error.code = this.mapHttpStatusToCode(response.status);
                }
                
                throw error;
            }

            return data;
        } catch (error) {
            // Use the API Error Handler for comprehensive error processing
            if (typeof window !== 'undefined' && window.apiErrorHandler) {
                const errorResponse = await window.apiErrorHandler.handleError(error, {
                    operation: `${finalOptions.method || 'GET'} ${endpoint}`,
                    resource: endpoint,
                    timestamp: new Date().toISOString(),
                    userId: this.userId || null
                });
                throw errorResponse;
            } else {
                console.error(`API Error (${endpoint}):`, error);
                throw error;
            }
        }
    }

    /**
     * Map Supabase error codes to standardized error codes
     */
    mapSupabaseErrorCode(supabaseCode) {
        const errorMap = {
            // Authentication errors
            'invalid_credentials': 'UNAUTHORIZED',
            'email_not_confirmed': 'UNAUTHORIZED',
            'invalid_token': 'TOKEN_EXPIRED',
            'token_expired': 'TOKEN_EXPIRED',
            'insufficient_privileges': 'FORBIDDEN',
            
            // Database errors
            'unique_violation': 'CONFLICT',
            'foreign_key_violation': 'VALIDATION_ERROR',
            'check_violation': 'VALIDATION_ERROR',
            'not_null_violation': 'MISSING_REQUIRED',
            'invalid_text_representation': 'INVALID_FORMAT',
            
            // RLS errors
            'insufficient_privilege': 'FORBIDDEN',
            'row_level_security_violation': 'FORBIDDEN',
            
            // Connection errors
            'connection_failure': 'DATABASE_ERROR',
            'timeout': 'TIMEOUT_ERROR',
            
            // Rate limiting
            'too_many_requests': 'QUOTA_EXCEEDED'
        };
        
        return errorMap[supabaseCode] || 'DATABASE_ERROR';
    }

    /**
     * Map HTTP status codes to standardized error codes
     */
    mapHttpStatusToCode(status) {
        const statusMap = {
            400: 'VALIDATION_ERROR',
            401: 'UNAUTHORIZED',
            403: 'FORBIDDEN',
            404: 'NOT_FOUND',
            408: 'TIMEOUT_ERROR',
            409: 'CONFLICT',
            410: 'GONE',
            429: 'QUOTA_EXCEEDED',
            500: 'INTERNAL_ERROR',
            502: 'SERVICE_UNAVAILABLE',
            503: 'SERVICE_UNAVAILABLE',
            504: 'TIMEOUT_ERROR'
        };
        
        return statusMap[status] || 'UNKNOWN_ERROR';
    }

    /**
     * Execute operation with retry logic for transient errors
     */
    async withRetry(operation, context = {}) {
        if (typeof window !== 'undefined' && window.apiErrorHandler) {
            return await window.apiErrorHandler.retryOperation(operation, {
                ...context,
                service: 'supabase'
            });
        } else {
            // Fallback retry logic if error handler not available
            const maxAttempts = 3;
            let lastError;
            
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    return await operation();
                } catch (error) {
                    lastError = error;
                    
                    // Only retry for specific error types
                    const retryableErrors = ['NETWORK_ERROR', 'TIMEOUT_ERROR', 'DATABASE_ERROR', 'SERVICE_UNAVAILABLE'];
                    if (!retryableErrors.includes(error.code) || attempt === maxAttempts) {
                        throw error;
                    }
                    
                    // Wait before retry with exponential backoff
                    const delay = Math.pow(2, attempt - 1) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
            
            throw lastError;
        }
    }

    // Authentication methods
    async login(email, password) {
        try {
            const response = await this.makeRequest('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });

            if (response.data && response.data.tokens) {
                this.token = response.data.tokens.accessToken;
                this.refreshToken = response.data.tokens.refreshToken;
                
                localStorage.setItem('accessToken', this.token);
                localStorage.setItem('refreshToken', this.refreshToken);
                localStorage.setItem('user', JSON.stringify(response.data.user));
            }

            return response;
        } catch (error) {
            throw new Error(`Login failed: ${error.message}`);
        }
    }

    async register(userData) {
        try {
            const response = await this.makeRequest('/auth/register', {
                method: 'POST',
                body: JSON.stringify(userData)
            });

            if (response.data && response.data.tokens) {
                this.token = response.data.tokens.accessToken;
                this.refreshToken = response.data.tokens.refreshToken;
                
                localStorage.setItem('accessToken', this.token);
                localStorage.setItem('refreshToken', this.refreshToken);
                localStorage.setItem('user', JSON.stringify(response.data.user));
            }

            return response;
        } catch (error) {
            throw new Error(`Registration failed: ${error.message}`);
        }
    }

    async refreshAccessToken() {
        try {
            const response = await this.makeRequest('/auth/refresh', {
                method: 'POST',
                body: JSON.stringify({ refreshToken: this.refreshToken })
            });

            if (response.data && response.data.tokens) {
                this.token = response.data.tokens.accessToken;
                this.refreshToken = response.data.tokens.refreshToken;
                
                localStorage.setItem('accessToken', this.token);
                localStorage.setItem('refreshToken', this.refreshToken);
                
                return true;
            }

            return false;
        } catch (error) {
            console.error('Token refresh failed:', error);
            this.logout();
            return false;
        }
    }

    async logout() {
        try {
            if (this.refreshToken) {
                await this.makeRequest('/auth/logout', {
                    method: 'POST',
                    body: JSON.stringify({ refreshToken: this.refreshToken })
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.token = null;
            this.refreshToken = null;
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
        }
    }

    // Case Study methods
    async getCaseStudies(params = {}) {
        return await this.withRetry(async () => {
            const queryString = new URLSearchParams(params).toString();
            const endpoint = `/case-studies${queryString ? `?${queryString}` : ''}`;
            
            return await this.makeRequest(endpoint);
        }, {
            operation: 'getCaseStudies',
            resource: 'case-studies'
        });
    }

    async getCaseStudy(id) {
        return await this.withRetry(async () => {
            return await this.makeRequest(`/case-studies/${id}`);
        }, {
            operation: 'getCaseStudy',
            resource: `case-studies/${id}`
        });
    }

    async createCaseStudy(caseStudyData) {
        return await this.withRetry(async () => {
            return await this.makeRequest('/case-studies', {
                method: 'POST',
                body: JSON.stringify(caseStudyData)
            });
        }, {
            operation: 'createCaseStudy',
            resource: 'case-studies'
        });
    }

    async updateCaseStudy(id, caseStudyData) {
        return await this.withRetry(async () => {
            return await this.makeRequest(`/case-studies/${id}`, {
                method: 'PUT',
                body: JSON.stringify(caseStudyData)
            });
        }, {
            operation: 'updateCaseStudy',
            resource: `case-studies/${id}`
        });
    }

    async deleteCaseStudy(id) {
        try {
            return await this.makeRequest(`/case-studies/${id}`, {
                method: 'DELETE'
            });
        } catch (error) {
            throw new Error(`Failed to delete case study: ${error.message}`);
        }
    }

    async publishCaseStudy(id) {
        try {
            return await this.makeRequest(`/case-studies/${id}/publish`, {
                method: 'POST'
            });
        } catch (error) {
            throw new Error(`Failed to publish case study: ${error.message}`);
        }
    }

    // File upload methods - FIXED VERSION
    async uploadImage(file, options = {}) {
        try {
            // Fallback to direct Cloudinary upload if API server not available
            if (!this.token || !await this.checkServerAvailability()) {
                return await this.uploadToCloudinaryDirect(file, options);
            }

            const formData = new FormData();
            formData.append('image', file);
            
            if (options.folder) {
                formData.append('folder', options.folder);
            }
            
            if (options.optimize !== undefined) {
                formData.append('optimize', options.optimize.toString());
            }

            return await this.makeRequest('/upload/image', {
                method: 'POST',
                headers: {
                    // Remove Content-Type to let browser set it with boundary
                    'Authorization': `Bearer ${this.token}`
                },
                body: formData
            });
        } catch (error) {
            console.warn('API upload failed, falling back to direct Cloudinary:', error);
            return await this.uploadToCloudinaryDirect(file, options);
        }
    }

    async checkServerAvailability() {
        try {
            const response = await fetch(`${this.baseURL}/health`);
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    async uploadToCloudinaryDirect(file, options = {}) {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', 'ml_default');
            formData.append('api_key', '951533987774134');
            formData.append('folder', `portfolio/case-studies/${options.folder || 'general'}`);
            formData.append('tags', `case-study,${options.folder || 'general'}`);

            const response = await fetch('https://api.cloudinary.com/v1_1/dgymjtqil/image/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Cloudinary upload failed');
            }

            const result = await response.json();
            
            return {
                data: {
                    id: result.public_id,
                    url: result.secure_url,
                    publicId: result.public_id,
                    width: result.width,
                    height: result.height,
                    size: result.bytes,
                    folder: options.folder || 'general'
                }
            };
        } catch (error) {
            throw new Error(`Direct Cloudinary upload failed: ${error.message}`);
        }
    }

    async uploadMultipleImages(files, options = {}) {
        try {
            const formData = new FormData();
            
            files.forEach(file => {
                formData.append('images', file);
            });
            
            if (options.folder) {
                formData.append('folder', options.folder);
            }
            
            if (options.optimize !== undefined) {
                formData.append('optimize', options.optimize.toString());
            }

            return await this.makeRequest('/upload/multiple', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                },
                body: formData
            });
        } catch (error) {
            throw new Error(`Failed to upload images: ${error.message}`);
        }
    }

    async deleteFile(fileId) {
        try {
            return await this.makeRequest(`/upload/${fileId}`, {
                method: 'DELETE'
            });
        } catch (error) {
            throw new Error(`Failed to delete file: ${error.message}`);
        }
    }

    async getUserFiles(params = {}) {
        try {
            const queryString = new URLSearchParams(params).toString();
            const endpoint = `/upload/files${queryString ? `?${queryString}` : ''}`;
            
            return await this.makeRequest(endpoint);
        } catch (error) {
            throw new Error(`Failed to fetch files: ${error.message}`);
        }
    }

    async getStorageUsage() {
        try {
            return await this.makeRequest('/upload/storage-usage');
        } catch (error) {
            throw new Error(`Failed to fetch storage usage: ${error.message}`);
        }
    }

    // Image reference methods
    async createImageReference(imageData) {
        try {
            return await this.makeRequest('/images', {
                method: 'POST',
                body: JSON.stringify(imageData)
            });
        } catch (error) {
            throw new Error(`Failed to create image reference: ${error.message}`);
        }
    }

    async getImageReferences(context, referenceId) {
        try {
            const queryParams = new URLSearchParams();
            if (context) queryParams.append('context', context);
            if (referenceId) queryParams.append('reference_id', referenceId);
            
            const endpoint = `/images${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
            return await this.makeRequest(endpoint);
        } catch (error) {
            throw new Error(`Failed to get image references: ${error.message}`);
        }
    }

    async updateImageReference(id, updates) {
        try {
            return await this.makeRequest(`/images/${id}`, {
                method: 'PUT',
                body: JSON.stringify(updates)
            });
        } catch (error) {
            throw new Error(`Failed to update image reference: ${error.message}`);
        }
    }

    async deleteImageReference(id) {
        try {
            return await this.makeRequest(`/images/${id}`, {
                method: 'DELETE'
            });
        } catch (error) {
            throw new Error(`Failed to delete image reference: ${error.message}`);
        }
    }

    // Utility methods
    isAuthenticated() {
        return !!this.token;
    }

    getCurrentUser() {
        try {
            const userStr = localStorage.getItem('user');
            return userStr ? JSON.parse(userStr) : null;
        } catch (error) {
            console.error('Error parsing user data:', error);
            return null;
        }
    }

    // Real-time features (WebSocket integration)
    connectWebSocket() {
        if (!this.token) return;

        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsURL = `${wsProtocol}//${window.location.host}/ws?token=${this.token}`;
        
        this.ws = new WebSocket(wsURL);
        
        this.ws.onopen = () => {
            console.log('WebSocket connected');
        };
        
        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            } catch (error) {
                console.error('WebSocket message parsing error:', error);
            }
        };
        
        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            // Attempt to reconnect after 5 seconds
            setTimeout(() => {
                if (this.token) {
                    this.connectWebSocket();
                }
            }, 5000);
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    handleWebSocketMessage(data) {
        // Handle real-time updates
        switch (data.type) {
            case 'case_study_updated':
                this.onCaseStudyUpdated?.(data.payload);
                break;
            case 'user_presence':
                this.onUserPresence?.(data.payload);
                break;
            case 'notification':
                this.onNotification?.(data.payload);
                break;
            default:
                console.log('Unknown WebSocket message type:', data.type);
        }
    }

    disconnectWebSocket() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    // Event handlers (can be overridden)
    onCaseStudyUpdated(data) {
        console.log('Case study updated:', data);
    }

    onUserPresence(data) {
        console.log('User presence update:', data);
    }

    onNotification(data) {
        console.log('Notification received:', data);
    }
}

// Create global instance
window.saasService = new SaaSCaseStudyService();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SaaSCaseStudyService;
}
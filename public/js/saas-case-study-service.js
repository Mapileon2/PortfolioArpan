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
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            throw error;
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
        try {
            const queryString = new URLSearchParams(params).toString();
            const endpoint = `/case-studies${queryString ? `?${queryString}` : ''}`;
            
            return await this.makeRequest(endpoint);
        } catch (error) {
            throw new Error(`Failed to fetch case studies: ${error.message}`);
        }
    }

    async getCaseStudy(id) {
        try {
            return await this.makeRequest(`/case-studies/${id}`);
        } catch (error) {
            throw new Error(`Failed to fetch case study: ${error.message}`);
        }
    }

    async createCaseStudy(caseStudyData) {
        try {
            return await this.makeRequest('/case-studies', {
                method: 'POST',
                body: JSON.stringify(caseStudyData)
            });
        } catch (error) {
            throw new Error(`Failed to create case study: ${error.message}`);
        }
    }

    async updateCaseStudy(id, caseStudyData) {
        try {
            return await this.makeRequest(`/case-studies/${id}`, {
                method: 'PUT',
                body: JSON.stringify(caseStudyData)
            });
        } catch (error) {
            throw new Error(`Failed to update case study: ${error.message}`);
        }
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

    // File upload methods
    async uploadImage(file, options = {}) {
        try {
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
            throw new Error(`Failed to upload image: ${error.message}`);
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
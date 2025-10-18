/**
 * Centralized Error Handler
 * 
 * Provides consistent error handling across the SaaS system
 * Standardizes error response format and user-friendly error messages
 * 
 * Requirements: 5.4
 */

class ErrorHandler {
    constructor() {
        this.errorLog = [];
        this.errorListeners = [];
        this.config = {
            maxLogSize: 1000,
            enableLogging: true,
            enableNotifications: true,
            enableRetry: true
        };
        
        this.init();
    }

    init() {
        console.log('🚨 Error Handler initialized');
        
        // Setup global error handlers
        this.setupGlobalHandlers();
        
        // Setup error classification
        this.setupErrorClassification();
        
        // Setup user message mapping
        this.setupUserMessages();
    }

    /**
     * Setup global error handlers
     */
    setupGlobalHandlers() {
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('🚨 Unhandled promise rejection:', event.reason);
            this.handleError(event.reason, {
                type: 'unhandled_promise',
                source: 'global'
            });
        });

        // Handle JavaScript errors
        window.addEventListener('error', (event) => {
            console.error('🚨 JavaScript error:', event.error);
            this.handleError(event.error, {
                type: 'javascript_error',
                source: 'global',
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });
    }

    /**
     * Setup error classification system
     */
    setupErrorClassification() {
        this.errorTypes = {
            // Network errors
            NETWORK_ERROR: {
                severity: 'high',
                retryable: true,
                userMessage: 'Network connection issue. Please check your internet connection.',
                category: 'network'
            },
            TIMEOUT_ERROR: {
                severity: 'medium',
                retryable: true,
                userMessage: 'Request timed out. Please try again.',
                category: 'network'
            },
            
            // Authentication errors
            AUTHENTICATION_ERROR: {
                severity: 'high',
                retryable: false,
                userMessage: 'Please log in to continue.',
                category: 'auth',
                action: 'redirect_login'
            },
            PERMISSION_ERROR: {
                severity: 'medium',
                retryable: false,
                userMessage: 'You do not have permission to perform this action.',
                category: 'auth'
            },
            
            // Validation errors
            VALIDATION_ERROR: {
                severity: 'low',
                retryable: false,
                userMessage: 'Please check your input and try again.',
                category: 'validation'
            },
            
            // Server errors
            SERVER_ERROR: {
                severity: 'high',
                retryable: true,
                userMessage: 'Server error. Please try again later.',
                category: 'server'
            },
            RATE_LIMITED: {
                severity: 'medium',
                retryable: true,
                userMessage: 'Too many requests. Please wait a moment and try again.',
                category: 'server'
            },
            
            // Data errors
            NOT_FOUND: {
                severity: 'medium',
                retryable: false,
                userMessage: 'The requested item was not found.',
                category: 'data'
            },
            CONFLICT_ERROR: {
                severity: 'medium',
                retryable: false,
                userMessage: 'There was a conflict with your request. Please refresh and try again.',
                category: 'data'
            },
            
            // Application errors
            CONCURRENT_UPDATE: {
                severity: 'medium',
                retryable: false,
                userMessage: 'Another user has updated this item. Please refresh and try again.',
                category: 'application',
                action: 'show_conflict_resolution'
            },
            
            // Unknown errors
            UNKNOWN_ERROR: {
                severity: 'medium',
                retryable: true,
                userMessage: 'An unexpected error occurred. Please try again.',
                category: 'unknown'
            }
        };
    }

    /**
     * Setup user-friendly messages
     */
    setupUserMessages() {
        this.contextualMessages = {
            'case_study_save': {
                NETWORK_ERROR: 'Unable to save case study due to network issues. Your changes are preserved locally.',
                VALIDATION_ERROR: 'Please fill in all required fields before saving your case study.',
                CONCURRENT_UPDATE: 'Another user has updated this case study while you were editing. Please review their changes.',
                SERVER_ERROR: 'Unable to save case study due to server issues. Please try again in a moment.'
            },
            'image_upload': {
                NETWORK_ERROR: 'Image upload failed due to network issues. Please check your connection and try again.',
                VALIDATION_ERROR: 'Please select a valid image file (JPG, PNG, GIF, or WebP) under 10MB.',
                SERVER_ERROR: 'Image upload failed due to server issues. Please try again later.'
            },
            'case_study_load': {
                NOT_FOUND: 'This case study could not be found. It may have been deleted or moved.',
                PERMISSION_ERROR: 'You do not have permission to view this case study.',
                SERVER_ERROR: 'Unable to load case study due to server issues. Please refresh the page.'
            }
        };
    }

    /**
     * Main error handling method
     */
    handleError(error, context = {}) {
        try {
            // Normalize error object
            const normalizedError = this.normalizeError(error);
            
            // Classify error
            const classification = this.classifyError(normalizedError);
            
            // Create standardized error response
            const errorResponse = this.createErrorResponse(normalizedError, classification, context);
            
            // Log error
            if (this.config.enableLogging) {
                this.logError(errorResponse);
            }
            
            // Notify listeners
            this.notifyErrorListeners(errorResponse);
            
            // Handle specific actions
            this.handleErrorActions(errorResponse);
            
            // Show user notification if enabled
            if (this.config.enableNotifications && context.showNotification !== false) {
                this.showErrorNotification(errorResponse);
            }
            
            return errorResponse;
            
        } catch (handlingError) {
            console.error('🚨 Error in error handler:', handlingError);
            return this.createFallbackErrorResponse(error, context);
        }
    }

    /**
     * Normalize error to standard format
     */
    normalizeError(error) {
        if (!error) {
            return new Error('Unknown error occurred');
        }
        
        if (typeof error === 'string') {
            return new Error(error);
        }
        
        if (error instanceof Error) {
            return error;
        }
        
        if (typeof error === 'object') {
            const normalizedError = new Error(error.message || 'Unknown error');
            normalizedError.code = error.code;
            normalizedError.status = error.status;
            normalizedError.details = error.details;
            return normalizedError;
        }
        
        return new Error('Unknown error occurred');
    }

    /**
     * Classify error type and severity
     */
    classifyError(error) {
        // Check for specific error codes
        if (error.code && this.errorTypes[error.code]) {
            return this.errorTypes[error.code];
        }
        
        // Check HTTP status codes
        if (error.status) {
            if (error.status === 401) return this.errorTypes.AUTHENTICATION_ERROR;
            if (error.status === 403) return this.errorTypes.PERMISSION_ERROR;
            if (error.status === 404) return this.errorTypes.NOT_FOUND;
            if (error.status === 409) return this.errorTypes.CONFLICT_ERROR;
            if (error.status === 429) return this.errorTypes.RATE_LIMITED;
            if (error.status >= 500) return this.errorTypes.SERVER_ERROR;
            if (error.status >= 400) return this.errorTypes.VALIDATION_ERROR;
        }
        
        // Check error message patterns
        const message = error.message.toLowerCase();
        if (message.includes('network') || message.includes('fetch')) {
            return this.errorTypes.NETWORK_ERROR;
        }
        if (message.includes('timeout')) {
            return this.errorTypes.TIMEOUT_ERROR;
        }
        if (message.includes('validation') || message.includes('invalid')) {
            return this.errorTypes.VALIDATION_ERROR;
        }
        if (message.includes('concurrent') || message.includes('conflict')) {
            return this.errorTypes.CONCURRENT_UPDATE;
        }
        
        // Default to unknown error
        return this.errorTypes.UNKNOWN_ERROR;
    }

    /**
     * Create standardized error response
     */
    createErrorResponse(error, classification, context) {
        const errorCode = error.code || classification.category.toUpperCase() + '_ERROR';
        
        return {
            success: false,
            error: {
                code: errorCode,
                message: error.message,
                userMessage: this.getUserMessage(errorCode, context),
                severity: classification.severity,
                category: classification.category,
                retryable: classification.retryable,
                details: error.details || null,
                context: context,
                timestamp: new Date().toISOString(),
                action: classification.action || null
            }
        };
    }

    /**
     * Get user-friendly error message
     */
    getUserMessage(errorCode, context) {
        // Check for contextual messages first
        if (context.operation && this.contextualMessages[context.operation]) {
            const contextualMessage = this.contextualMessages[context.operation][errorCode];
            if (contextualMessage) {
                return contextualMessage;
            }
        }
        
        // Fall back to general error type message
        const errorType = this.errorTypes[errorCode];
        if (errorType) {
            return errorType.userMessage;
        }
        
        // Final fallback
        return 'An unexpected error occurred. Please try again.';
    }

    /**
     * Log error to internal log
     */
    logError(errorResponse) {
        this.errorLog.push({
            ...errorResponse,
            id: this.generateErrorId(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            timestamp: new Date().toISOString()
        });
        
        // Maintain log size limit
        if (this.errorLog.length > this.config.maxLogSize) {
            this.errorLog = this.errorLog.slice(-this.config.maxLogSize);
        }
        
        // Also log to console for development
        console.error('🚨 Error logged:', errorResponse);
    }

    /**
     * Notify error listeners
     */
    notifyErrorListeners(errorResponse) {
        this.errorListeners.forEach(listener => {
            try {
                listener(errorResponse);
            } catch (listenerError) {
                console.error('🚨 Error listener failed:', listenerError);
            }
        });
    }

    /**
     * Handle specific error actions
     */
    handleErrorActions(errorResponse) {
        const action = errorResponse.error.action;
        
        switch (action) {
            case 'redirect_login':
                this.redirectToLogin();
                break;
                
            case 'show_conflict_resolution':
                this.showConflictResolution(errorResponse);
                break;
                
            case 'refresh_page':
                this.suggestPageRefresh(errorResponse);
                break;
        }
    }

    /**
     * Show error notification to user
     */
    showErrorNotification(errorResponse) {
        const { error } = errorResponse;
        
        // Use existing notification system if available
        if (window.showNotification) {
            const notificationType = this.getNotificationType(error.severity);
            window.showNotification(notificationType, 'Error', error.userMessage);
        } else if (window.alert) {
            // Fallback to alert
            window.alert(`Error: ${error.userMessage}`);
        } else {
            // Log to console as final fallback
            console.error('🚨 Error notification:', error.userMessage);
        }
    }

    /**
     * Get notification type based on severity
     */
    getNotificationType(severity) {
        const typeMap = {
            'low': 'warning',
            'medium': 'error',
            'high': 'error'
        };
        return typeMap[severity] || 'error';
    }

    /**
     * Redirect to login page
     */
    redirectToLogin() {
        console.log('🔄 Redirecting to login due to authentication error');
        
        // Store current page for redirect after login
        localStorage.setItem('redirect_after_login', window.location.href);
        
        // Redirect to login page
        window.location.href = '/admin-login.html';
    }

    /**
     * Show conflict resolution UI
     */
    showConflictResolution(errorResponse) {
        console.log('🔄 Showing conflict resolution UI');
        
        // Use concurrent update handler if available
        if (window.concurrentUpdateHandler) {
            // This would be handled by the concurrent update handler
            console.log('✅ Concurrent update handler available');
        } else {
            // Fallback to simple notification
            this.showErrorNotification({
                error: {
                    ...errorResponse.error,
                    userMessage: 'Please refresh the page to see the latest changes.'
                }
            });
        }
    }

    /**
     * Suggest page refresh
     */
    suggestPageRefresh(errorResponse) {
        const shouldRefresh = confirm(
            `${errorResponse.error.userMessage}\n\nWould you like to refresh the page?`
        );
        
        if (shouldRefresh) {
            window.location.reload();
        }
    }

    /**
     * Create fallback error response
     */
    createFallbackErrorResponse(error, context) {
        return {
            success: false,
            error: {
                code: 'HANDLER_ERROR',
                message: 'Error handler failed',
                userMessage: 'An unexpected error occurred. Please try again.',
                severity: 'high',
                category: 'system',
                retryable: true,
                details: { originalError: error, context },
                timestamp: new Date().toISOString()
            }
        };
    }

    /**
     * Generate unique error ID
     */
    generateErrorId() {
        return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // ==================== PUBLIC API ====================

    /**
     * Add error listener
     */
    addErrorListener(listener) {
        this.errorListeners.push(listener);
        
        // Return unsubscribe function
        return () => {
            const index = this.errorListeners.indexOf(listener);
            if (index > -1) {
                this.errorListeners.splice(index, 1);
            }
        };
    }

    /**
     * Get error log
     */
    getErrorLog(limit = 50) {
        return this.errorLog.slice(-limit);
    }

    /**
     * Clear error log
     */
    clearErrorLog() {
        this.errorLog = [];
        console.log('✅ Error log cleared');
    }

    /**
     * Get error statistics
     */
    getErrorStats() {
        const stats = {
            total: this.errorLog.length,
            byCategory: {},
            bySeverity: {},
            recent: this.errorLog.slice(-10).length
        };
        
        this.errorLog.forEach(error => {
            const category = error.error.category;
            const severity = error.error.severity;
            
            stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
            stats.bySeverity[severity] = (stats.bySeverity[severity] || 0) + 1;
        });
        
        return stats;
    }

    /**
     * Test error handling
     */
    testErrorHandling() {
        console.log('🧪 Testing error handling...');
        
        // Test different error types
        const testErrors = [
            new Error('Test network error'),
            { code: 'VALIDATION_ERROR', message: 'Test validation error' },
            { status: 404, message: 'Test not found error' },
            { code: 'CONCURRENT_UPDATE', message: 'Test concurrent update' }
        ];
        
        testErrors.forEach((error, index) => {
            setTimeout(() => {
                this.handleError(error, { 
                    operation: 'test',
                    showNotification: false 
                });
            }, index * 100);
        });
        
        console.log('✅ Error handling test completed');
    }
}

// Auto-initialize
if (typeof window !== 'undefined') {
    window.errorHandler = new ErrorHandler();
    
    // Add global error handling function
    window.handleError = (error, context) => {
        return window.errorHandler.handleError(error, context);
    };
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorHandler;
}
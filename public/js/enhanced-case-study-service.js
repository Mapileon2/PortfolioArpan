/**
 * Enhanced Case Study Service - Client-side persistence fixes
 * 
 * Addresses client-side persistence issues identified in the audit:
 * - Adds loading states during save operations
 * - Implements success/error notifications
 * - Adds automatic re-fetch after save
 * - Handles concurrent update scenarios
 * - Provides retry logic for failed operations
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 */

class EnhancedCaseStudyService {
    constructor(baseService) {
        this.baseService = baseService || window.saasService;
        this.retryAttempts = 3;
        this.retryDelay = 1000;
        this.saveInProgress = false;
        this.lastSaveTimestamp = null;
        
        // Event listeners for save state changes
        this.saveStateListeners = [];
        
        // Initialize API error handler
        this.errorHandler = null;
        this.initializeErrorHandler();
        
        // Initialize notification system
        this.notifications = null;
        this.initializeNotifications();
        
        console.log('🚀 Enhanced Case Study Service initialized with error handling and notifications');
    }

    /**
     * Initialize error handler when available
     */
    initializeErrorHandler() {
        if (typeof window !== 'undefined' && window.apiErrorHandler) {
            this.errorHandler = window.apiErrorHandler;
        } else {
            // Retry initialization after a short delay
            setTimeout(() => {
                this.initializeErrorHandler();
            }, 100);
        }
    }

    /**
     * Initialize notification system when available
     */
    initializeNotifications() {
        if (typeof window !== 'undefined' && window.notificationSystem) {
            this.notifications = window.notificationSystem;
        } else {
            // Retry initialization after a short delay
            setTimeout(() => {
                this.initializeNotifications();
            }, 100);
        }
    }

    /**
     * Enhanced create with loading states and re-fetch
     */
    async createCaseStudy(caseStudyData, options = {}) {
        const { 
            showLoading = true, 
            enableRetry = true,
            enableRefetch = true 
        } = options;

        if (this.saveInProgress) {
            throw new Error('Save operation already in progress');
        }

        try {
            this.saveInProgress = true;
            
            if (showLoading) {
                this.notifySaveStateChange('saving', 'Creating case study...');
            }

            console.log('📝 Enhanced create starting:', caseStudyData.project_title);

            // Perform the create operation with retry logic
            const result = await this.performWithRetry(
                () => this.baseService.createCaseStudy(caseStudyData),
                enableRetry
            );

            // Re-fetch to confirm persistence if enabled
            if (enableRefetch && result.data && result.data.id) {
                console.log('🔍 Re-fetching created case study to confirm persistence...');
                
                const refetchedData = await this.refetchCaseStudy(result.data.id);
                if (refetchedData) {
                    result.data = refetchedData;
                    result.verified = true;
                    console.log('✅ Create operation verified through re-fetch');
                } else {
                    console.warn('⚠️ Re-fetch failed, but create appeared successful');
                    result.verified = false;
                }
            }

            this.lastSaveTimestamp = new Date().toISOString();
            
            if (showLoading) {
                this.notifySaveStateChange('success', 'Case study created successfully');
            }

            console.log('✅ Enhanced create completed:', result.data?.id);
            
            return {
                ...result,
                enhanced: true,
                verified: result.verified || false,
                timestamp: this.lastSaveTimestamp
            };

        } catch (error) {
            console.error('❌ Enhanced create failed:', error);
            
            // Use API error handler for comprehensive error handling
            let handledError = error;
            if (this.errorHandler) {
                try {
                    handledError = await this.errorHandler.handleError(error, {
                        operation: 'create_case_study',
                        service: 'enhanced_case_study_service',
                        data: caseStudyData
                    });
                } catch (handlerError) {
                    console.error('❌ Error handler failed:', handlerError);
                }
            }
            
            if (showLoading) {
                const errorMessage = handledError.userMessage || handledError.error?.message || error.message || 'Create failed';
                this.notifySaveStateChange('error', errorMessage);
            }

            throw this.enhanceError(error, 'create');
        } finally {
            this.saveInProgress = false;
        }
    }

    /**
     * Enhanced update with concurrent update handling and re-fetch
     */
    async updateCaseStudy(id, caseStudyData, options = {}) {
        const { 
            showLoading = true, 
            enableRetry = true,
            enableRefetch = true,
            handleConcurrentUpdates = true 
        } = options;

        if (this.saveInProgress) {
            throw new Error('Save operation already in progress');
        }

        try {
            this.saveInProgress = true;
            
            if (showLoading) {
                this.notifySaveStateChange('saving', 'Updating case study...');
            }

            console.log('📝 Enhanced update starting for ID:', id);

            // Add current timestamp for optimistic locking
            const updateData = {
                ...caseStudyData,
                updated_at: caseStudyData.updated_at || new Date().toISOString()
            };

            // Perform the update operation with retry logic
            const result = await this.performWithRetry(
                () => this.baseService.updateCaseStudy(id, updateData),
                enableRetry
            );

            // Handle concurrent update detection
            if (result.error === 'CONCURRENT_UPDATE' && handleConcurrentUpdates) {
                console.log('🔄 Concurrent update detected, handling...');
                
                if (showLoading) {
                    this.notifySaveStateChange('warning', 'Concurrent update detected');
                }

                return {
                    success: false,
                    error: 'CONCURRENT_UPDATE',
                    message: 'Another user has updated this case study. Please refresh and try again.',
                    requiresRefresh: true,
                    enhanced: true
                };
            }

            // Re-fetch to confirm persistence if enabled
            if (enableRefetch && result.data && result.data.id) {
                console.log('🔍 Re-fetching updated case study to confirm persistence...');
                
                const refetchedData = await this.refetchCaseStudy(result.data.id);
                if (refetchedData) {
                    // Verify the update actually persisted
                    const originalTimestamp = result.data.updated_at;
                    const refetchedTimestamp = refetchedData.updated_at;
                    
                    if (originalTimestamp === refetchedTimestamp) {
                        console.log('✅ Update operation verified - timestamps match');
                        result.verified = true;
                    } else {
                        console.warn('⚠️ Timestamp mismatch, but data exists:', {
                            original: originalTimestamp,
                            refetched: refetchedTimestamp
                        });
                        result.verified = false;
                    }
                    
                    result.data = refetchedData;
                } else {
                    console.warn('⚠️ Re-fetch failed, but update appeared successful');
                    result.verified = false;
                }
            }

            this.lastSaveTimestamp = new Date().toISOString();
            
            if (showLoading) {
                this.notifySaveStateChange('success', 'Case study updated successfully');
            }

            console.log('✅ Enhanced update completed:', result.data?.id);
            
            return {
                ...result,
                enhanced: true,
                verified: result.verified || false,
                timestamp: this.lastSaveTimestamp
            };

        } catch (error) {
            console.error('❌ Enhanced update failed:', error);
            
            // Use API error handler for comprehensive error handling
            let handledError = error;
            if (this.errorHandler) {
                try {
                    handledError = await this.errorHandler.handleError(error, {
                        operation: 'update_case_study',
                        service: 'enhanced_case_study_service',
                        caseStudyId: id,
                        data: caseStudyData
                    });
                } catch (handlerError) {
                    console.error('❌ Error handler failed:', handlerError);
                }
            }
            
            if (showLoading) {
                const errorMessage = handledError.userMessage || handledError.error?.message || error.message || 'Update failed';
                this.notifySaveStateChange('error', errorMessage);
            }

            throw this.enhanceError(error, 'update');
        } finally {
            this.saveInProgress = false;
        }
    }

    /**
     * Re-fetch case study to confirm persistence
     */
    async refetchCaseStudy(id, maxAttempts = 3) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                console.log(`🔍 Re-fetch attempt ${attempt}/${maxAttempts} for case study:`, id);
                
                const result = await this.baseService.getCaseStudy(id);
                
                if (result && result.data) {
                    console.log('✅ Re-fetch successful on attempt:', attempt);
                    return result.data;
                }
                
                console.warn('⚠️ Re-fetch returned no data on attempt:', attempt);
                
            } catch (error) {
                console.error(`❌ Re-fetch attempt ${attempt} failed:`, error.message);
                
                if (attempt === maxAttempts) {
                    throw error;
                }
                
                // Wait before retry
                await this.delay(this.retryDelay * attempt);
            }
        }
        
        return null;
    }

    /**
     * Perform operation with retry logic
     */
    async performWithRetry(operation, enableRetry = true) {
        const maxAttempts = enableRetry ? this.retryAttempts : 1;
        let lastError;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                console.log(`🔄 Operation attempt ${attempt}/${maxAttempts}`);
                
                const result = await operation();
                
                console.log('✅ Operation successful on attempt:', attempt);
                return result;
                
            } catch (error) {
                lastError = error;
                console.error(`❌ Operation attempt ${attempt} failed:`, error.message);

                // Don't retry on certain errors
                if (this.isNonRetryableError(error) || attempt === maxAttempts) {
                    throw error;
                }

                // Wait before retry
                await this.delay(this.retryDelay * attempt);
            }
        }

        throw lastError;
    }

    /**
     * Check if error should not be retried
     */
    isNonRetryableError(error) {
        const nonRetryableErrors = [
            'VALIDATION_ERROR',
            'NOT_FOUND',
            'CONCURRENT_UPDATE',
            'DUPLICATE_ENTRY'
        ];

        return nonRetryableErrors.some(errorType => 
            error.message.includes(errorType) || 
            error.code === errorType
        );
    }

    /**
     * Enhance error with additional context
     */
    enhanceError(error, operation) {
        const enhancedError = new Error(error.message);
        enhancedError.originalError = error;
        enhancedError.operation = operation;
        enhancedError.timestamp = new Date().toISOString();
        enhancedError.enhanced = true;
        
        // Add specific error codes
        if (error.message.includes('Validation failed')) {
            enhancedError.code = 'VALIDATION_ERROR';
        } else if (error.message.includes('not found')) {
            enhancedError.code = 'NOT_FOUND';
        } else if (error.message.includes('Concurrent update')) {
            enhancedError.code = 'CONCURRENT_UPDATE';
        } else {
            enhancedError.code = 'UNKNOWN_ERROR';
        }
        
        return enhancedError;
    }

    /**
     * Notify save state change to listeners
     */
    notifySaveStateChange(state, message) {
        const event = {
            state, // 'saving', 'success', 'error', 'warning'
            message,
            timestamp: new Date().toISOString()
        };

        console.log('📢 Save state change:', event);

        // Show notification using notification system
        if (this.notifications) {
            switch (state) {
                case 'saving':
                    this.currentNotification = this.notifications.showLoading(message, {
                        title: 'Saving...'
                    });
                    break;
                case 'success':
                    // Dismiss loading notification if exists
                    if (this.currentNotification) {
                        this.notifications.dismiss(this.currentNotification.id);
                    }
                    this.notifications.showSuccess(message, {
                        title: 'Success'
                    });
                    break;
                case 'error':
                    // Dismiss loading notification if exists
                    if (this.currentNotification) {
                        this.notifications.dismiss(this.currentNotification.id);
                    }
                    this.notifications.showError(message, {
                        title: 'Error',
                        canRetry: true
                    });
                    break;
                case 'warning':
                    this.notifications.showWarning(message, {
                        title: 'Warning'
                    });
                    break;
            }
        }

        this.saveStateListeners.forEach(listener => {
            try {
                listener(event);
            } catch (error) {
                console.error('❌ Save state listener error:', error);
            }
        });
    }

    /**
     * Add save state change listener
     */
    onSaveStateChange(listener) {
        this.saveStateListeners.push(listener);
        
        // Return unsubscribe function
        return () => {
            const index = this.saveStateListeners.indexOf(listener);
            if (index > -1) {
                this.saveStateListeners.splice(index, 1);
            }
        };
    }

    /**
     * Get current save status
     */
    getSaveStatus() {
        return {
            saveInProgress: this.saveInProgress,
            lastSaveTimestamp: this.lastSaveTimestamp,
            retryAttempts: this.retryAttempts,
            retryDelay: this.retryDelay
        };
    }

    /**
     * Utility: Delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Batch save operations
     */
    async batchSave(operations) {
        console.log('🔄 Starting batch save operations:', operations.length);
        
        const results = [];
        const errors = [];

        for (const operation of operations) {
            try {
                let result;
                
                if (operation.type === 'create') {
                    result = await this.createCaseStudy(operation.data, operation.options);
                } else if (operation.type === 'update') {
                    result = await this.updateCaseStudy(operation.id, operation.data, operation.options);
                }
                
                results.push(result);
            } catch (error) {
                errors.push({
                    operation,
                    error: error.message
                });
            }
        }

        return {
            success: errors.length === 0,
            results,
            errors,
            processed: results.length,
            failed: errors.length
        };
    }
}

// Auto-initialize if base service is available
if (typeof window !== 'undefined') {
    // Wait for base service to be available
    const initEnhancedService = () => {
        if (window.saasService) {
            window.enhancedCaseStudyService = new EnhancedCaseStudyService(window.saasService);
            console.log('✅ Enhanced Case Study Service auto-initialized');
        } else {
            // Retry after a short delay
            setTimeout(initEnhancedService, 100);
        }
    };
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initEnhancedService);
    } else {
        initEnhancedService();
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedCaseStudyService;
}
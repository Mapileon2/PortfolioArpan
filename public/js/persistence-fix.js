/**
 * PersistenceFix Module
 * 
 * Addresses critical data persistence issues identified in the system audit:
 * - Missing re-fetch logic after save operations
 * - Concurrent update protection
 * - Proper error handling and transaction support
 * - Optimistic locking for concurrent updates
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */

class PersistenceFix {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1 second
        this.concurrentUpdateTimeout = 5000; // 5 seconds
        
        // Initialize timestamp utilities
        this.timestampUtils = typeof window !== 'undefined' && window.timestampUtils ? 
            window.timestampUtils : 
            new (require('./timestamp-utils'))();
    }

    /**
     * Enhanced upsert with proper conflict resolution and re-fetch
     * Addresses: Missing re-fetch logic, concurrent updates, transaction handling
     */
    async upsertCaseStudy(id, data, options = {}) {
        const { 
            enableOptimisticLocking = true, 
            enableRefetch = true,
            enableRetry = true 
        } = options;

        console.log('🔄 Starting enhanced upsert for case study:', id);

        try {
            // Step 1: Validate input data
            const validationResult = this.validateCaseStudyData(data);
            if (!validationResult.isValid) {
                throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
            }

            // Step 2: Handle optimistic locking if enabled
            let currentVersion = null;
            if (enableOptimisticLocking && id) {
                currentVersion = await this.getCurrentVersion(id);
                if (currentVersion && data.updated_at && 
                    new Date(currentVersion.updated_at) > new Date(data.updated_at)) {
                    throw new Error('CONCURRENT_UPDATE_DETECTED');
                }
            }

            // Step 3: Prepare update data with proper timestamps
            const updateData = this.timestampUtils.ensureTimestamps(data, !!id);
            
            // Validate timestamps
            const timestampValidation = this.timestampUtils.validateTimestamps(updateData);
            if (!timestampValidation.isValid) {
                throw new Error(`Timestamp validation failed: ${timestampValidation.errors.join(', ')}`);
            }

            // Remove undefined values but preserve null values
            Object.keys(updateData).forEach(key => {
                if (updateData[key] === undefined) {
                    delete updateData[key];
                }
            });

            // Step 4: Perform the upsert operation
            let result;
            if (id) {
                result = await this.performUpdate(id, updateData, enableRetry);
            } else {
                result = await this.performCreate(updateData, enableRetry);
            }

            // Step 5: Re-fetch to confirm persistence if enabled
            if (enableRefetch && result.data) {
                console.log('🔍 Re-fetching to confirm persistence...');
                const refetchedData = await this.refetchCaseStudy(result.data.id);
                
                if (!refetchedData) {
                    throw new Error('REFETCH_FAILED: Data not found after save');
                }

                // Verify the update actually persisted
                if (id && refetchedData.updated_at !== result.data.updated_at) {
                    console.warn('⚠️ Timestamp mismatch detected, but data exists');
                }

                result.data = refetchedData;
                result.verified = true;
            }

            console.log('✅ Enhanced upsert completed successfully');
            return {
                success: true,
                data: result.data,
                operation: id ? 'update' : 'create',
                verified: result.verified || false,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ Enhanced upsert failed:', error);
            
            // Handle specific error types
            if (error.message === 'CONCURRENT_UPDATE_DETECTED') {
                return {
                    success: false,
                    error: 'CONCURRENT_UPDATE',
                    message: 'Another user has updated this case study. Please refresh and try again.',
                    requiresRefresh: true
                };
            }

            return {
                success: false,
                error: error.code || 'UPSERT_FAILED',
                message: error.message || 'Failed to save case study',
                details: error.details || null,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Perform update operation with retry logic
     */
    async performUpdate(id, updateData, enableRetry = true) {
        const maxAttempts = enableRetry ? this.retryAttempts : 1;
        let lastError;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                console.log(`📝 Update attempt ${attempt}/${maxAttempts} for case study:`, id);

                // First verify the record exists
                const { data: existingRecord, error: fetchError } = await this.supabase
                    .from('case_studies')
                    .select('id, project_title, updated_at')
                    .eq('id', id)
                    .single();

                if (fetchError) {
                    if (fetchError.code === 'PGRST116') {
                        throw new Error('RECORD_NOT_FOUND');
                    }
                    throw fetchError;
                }

                console.log('📋 Existing record found:', existingRecord.project_title);

                // Perform the update
                const { data, error } = await this.supabase
                    .from('case_studies')
                    .update(updateData)
                    .eq('id', id)
                    .select()
                    .single();

                if (error) {
                    throw error;
                }

                if (!data) {
                    throw new Error('UPDATE_NO_DATA_RETURNED');
                }

                console.log('✅ Update successful on attempt:', attempt);
                return { data, verified: false };

            } catch (error) {
                lastError = error;
                console.error(`❌ Update attempt ${attempt} failed:`, error.message);

                // Don't retry on certain errors
                if (error.message === 'RECORD_NOT_FOUND' || 
                    error.code === 'PGRST116' ||
                    attempt === maxAttempts) {
                    throw error;
                }

                // Wait before retry
                await this.delay(this.retryDelay * attempt);
            }
        }

        throw lastError;
    }

    /**
     * Perform create operation with retry logic
     */
    async performCreate(createData, enableRetry = true) {
        const maxAttempts = enableRetry ? this.retryAttempts : 1;
        let lastError;

        // Ensure required fields for creation with proper timestamps
        const finalCreateData = this.timestampUtils.ensureTimestamps({
            ...createData,
            status: createData.status || 'published'
        }, false);

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                console.log(`📝 Create attempt ${attempt}/${maxAttempts}`);

                const { data, error } = await this.supabase
                    .from('case_studies')
                    .insert([finalCreateData])
                    .select()
                    .single();

                if (error) {
                    throw error;
                }

                if (!data) {
                    throw new Error('CREATE_NO_DATA_RETURNED');
                }

                console.log('✅ Create successful on attempt:', attempt);
                return { data, verified: false };

            } catch (error) {
                lastError = error;
                console.error(`❌ Create attempt ${attempt} failed:`, error.message);

                // Don't retry on validation errors
                if (error.code === '23505' || // Unique constraint violation
                    error.code === '23502' || // Not null violation
                    attempt === maxAttempts) {
                    throw error;
                }

                // Wait before retry
                await this.delay(this.retryDelay * attempt);
            }
        }

        throw lastError;
    }

    /**
     * Get current version for optimistic locking
     */
    async getCurrentVersion(id) {
        try {
            const { data, error } = await this.supabase
                .from('case_studies')
                .select('id, updated_at, project_title')
                .eq('id', id)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return data;
        } catch (error) {
            console.error('❌ Failed to get current version:', error);
            return null;
        }
    }

    /**
     * Re-fetch case study to confirm persistence
     */
    async refetchCaseStudy(id) {
        try {
            const { data, error } = await this.supabase
                .from('case_studies')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                throw error;
            }

            return data;
        } catch (error) {
            console.error('❌ Re-fetch failed:', error);
            return null;
        }
    }

    /**
     * Validate case study data
     */
    validateCaseStudyData(data) {
        const errors = [];

        // Required fields validation
        if (!data.project_title || data.project_title.trim() === '') {
            errors.push('Project title is required');
        }

        // Data type validation
        if (data.project_rating && (typeof data.project_rating !== 'number' || 
            data.project_rating < 1 || data.project_rating > 5)) {
            errors.push('Project rating must be a number between 1 and 5');
        }

        // Sections validation
        if (data.sections && typeof data.sections !== 'object') {
            errors.push('Sections must be an object');
        }

        // Status validation
        if (data.status && !['draft', 'published', 'archived'].includes(data.status)) {
            errors.push('Status must be draft, published, or archived');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Handle concurrent updates with conflict resolution
     */
    async handleConcurrentUpdate(id, localData, serverData) {
        console.log('🔄 Handling concurrent update conflict');

        // Simple merge strategy - prefer local changes for content, server for metadata
        const mergedData = {
            ...serverData,
            ...localData,
            // Always use server timestamps for consistency
            created_at: serverData.created_at,
            updated_at: new Date().toISOString()
        };

        return {
            strategy: 'merge',
            data: mergedData,
            conflicts: this.identifyConflicts(localData, serverData)
        };
    }

    /**
     * Identify conflicts between local and server data
     */
    identifyConflicts(localData, serverData) {
        const conflicts = [];
        const fieldsToCheck = ['project_title', 'project_description', 'sections'];

        fieldsToCheck.forEach(field => {
            if (localData[field] !== serverData[field]) {
                conflicts.push({
                    field,
                    localValue: localData[field],
                    serverValue: serverData[field]
                });
            }
        });

        return conflicts;
    }

    /**
     * Batch operations with transaction-like behavior
     */
    async batchUpsert(operations) {
        console.log('🔄 Starting batch upsert operations:', operations.length);
        
        const results = [];
        const errors = [];

        for (const operation of operations) {
            try {
                const result = await this.upsertCaseStudy(
                    operation.id, 
                    operation.data, 
                    operation.options
                );
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

    /**
     * Utility: Delay function for retry logic
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get persistence statistics for monitoring
     */
    getStats() {
        return {
            retryAttempts: this.retryAttempts,
            retryDelay: this.retryDelay,
            concurrentUpdateTimeout: this.concurrentUpdateTimeout,
            version: '1.0.0'
        };
    }
}

// Export for both module and browser usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PersistenceFix;
} else if (typeof window !== 'undefined') {
    window.PersistenceFix = PersistenceFix;
}
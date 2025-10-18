/**
 * Timestamp Utilities
 * 
 * Provides consistent timestamp handling across the SaaS system
 * Ensures proper timezone handling and timestamp validation
 * 
 * Requirements: 3.7
 */

class TimestampUtils {
    constructor() {
        this.timezone = 'UTC';
        this.dateFormat = 'ISO';
        
        console.log('🕐 Timestamp Utils initialized with timezone:', this.timezone);
    }

    /**
     * Get current timestamp in UTC ISO format
     */
    now() {
        return new Date().toISOString();
    }

    /**
     * Create timestamp from date
     */
    fromDate(date) {
        if (!date) return null;
        
        if (typeof date === 'string') {
            date = new Date(date);
        }
        
        if (!(date instanceof Date) || isNaN(date.getTime())) {
            throw new Error('Invalid date provided');
        }
        
        return date.toISOString();
    }

    /**
     * Validate timestamp format
     */
    isValid(timestamp) {
        if (!timestamp || typeof timestamp !== 'string') {
            return false;
        }
        
        // Check ISO format
        const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
        if (!isoRegex.test(timestamp)) {
            return false;
        }
        
        // Check if date is valid
        const date = new Date(timestamp);
        return !isNaN(date.getTime());
    }

    /**
     * Compare timestamps
     */
    compare(timestamp1, timestamp2) {
        const date1 = new Date(timestamp1);
        const date2 = new Date(timestamp2);
        
        if (isNaN(date1.getTime()) || isNaN(date2.getTime())) {
            throw new Error('Invalid timestamps for comparison');
        }
        
        if (date1 < date2) return -1;
        if (date1 > date2) return 1;
        return 0;
    }

    /**
     * Check if timestamp1 is newer than timestamp2
     */
    isNewer(timestamp1, timestamp2) {
        return this.compare(timestamp1, timestamp2) > 0;
    }

    /**
     * Check if timestamp1 is older than timestamp2
     */
    isOlder(timestamp1, timestamp2) {
        return this.compare(timestamp1, timestamp2) < 0;
    }

    /**
     * Get time difference in milliseconds
     */
    diff(timestamp1, timestamp2) {
        const date1 = new Date(timestamp1);
        const date2 = new Date(timestamp2);
        
        if (isNaN(date1.getTime()) || isNaN(date2.getTime())) {
            throw new Error('Invalid timestamps for difference calculation');
        }
        
        return date1.getTime() - date2.getTime();
    }

    /**
     * Format timestamp for display
     */
    format(timestamp, options = {}) {
        const {
            includeTime = true,
            includeSeconds = false,
            locale = 'en-US',
            timeZone = 'UTC'
        } = options;

        if (!this.isValid(timestamp)) {
            return 'Invalid date';
        }

        const date = new Date(timestamp);
        
        const formatOptions = {
            timeZone,
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };

        if (includeTime) {
            formatOptions.hour = '2-digit';
            formatOptions.minute = '2-digit';
            
            if (includeSeconds) {
                formatOptions.second = '2-digit';
            }
        }

        return date.toLocaleString(locale, formatOptions);
    }

    /**
     * Get relative time (e.g., "2 minutes ago")
     */
    relative(timestamp) {
        if (!this.isValid(timestamp)) {
            return 'Invalid date';
        }

        const now = new Date();
        const date = new Date(timestamp);
        const diffMs = now.getTime() - date.getTime();
        
        // Future dates
        if (diffMs < 0) {
            return 'in the future';
        }

        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffSeconds < 60) {
            return 'just now';
        } else if (diffMinutes < 60) {
            return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
        } else if (diffHours < 24) {
            return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        } else if (diffDays < 7) {
            return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        } else {
            return this.format(timestamp, { includeTime: false });
        }
    }

    /**
     * Ensure data has proper timestamps
     */
    ensureTimestamps(data, isUpdate = false) {
        const now = this.now();
        const result = { ...data };

        // Always set updated_at for any operation
        result.updated_at = now;

        // Set created_at only for new records
        if (!isUpdate && !result.created_at) {
            result.created_at = now;
        }

        // Validate existing timestamps
        if (result.created_at && !this.isValid(result.created_at)) {
            console.warn('⚠️ Invalid created_at timestamp, fixing:', result.created_at);
            result.created_at = now;
        }

        return result;
    }

    /**
     * Validate timestamps in data object
     */
    validateTimestamps(data) {
        const errors = [];

        if (data.created_at && !this.isValid(data.created_at)) {
            errors.push('Invalid created_at timestamp');
        }

        if (data.updated_at && !this.isValid(data.updated_at)) {
            errors.push('Invalid updated_at timestamp');
        }

        // Check logical consistency
        if (data.created_at && data.updated_at) {
            if (this.isOlder(data.updated_at, data.created_at)) {
                errors.push('updated_at cannot be older than created_at');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Create audit timestamp entry
     */
    createAuditEntry(operation, entityId, userId = null) {
        return {
            operation, // 'create', 'update', 'delete'
            entity_id: entityId,
            user_id: userId,
            timestamp: this.now(),
            client_timestamp: this.now()
        };
    }

    /**
     * Get timezone offset information
     */
    getTimezoneInfo() {
        const now = new Date();
        return {
            timezone: this.timezone,
            offset: now.getTimezoneOffset(),
            offsetString: now.toTimeString().split(' ')[1],
            utcTime: now.toISOString(),
            localTime: now.toString()
        };
    }
}

// Create global instance
if (typeof window !== 'undefined') {
    window.timestampUtils = new TimestampUtils();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TimestampUtils;
}
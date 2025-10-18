/**
 * Notification System Module
 * 
 * Provides comprehensive user notifications for success, error, warning, and info messages
 * Integrates with the API Error Handler for seamless error communication
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */
class NotificationSystem {
    constructor() {
        this.notifications = [];
        this.container = null;
        this.maxNotifications = 5;
        this.defaultDuration = 5000; // 5 seconds
        this.initialized = false;
        this.styles = {
            success: {
                backgroundColor: '#10b981',
                borderColor: '#059669',
                icon: '✅'
            },
            error: {
                backgroundColor: '#ef4444',
                borderColor: '#dc2626',
                icon: '❌'
            },
            warning: {
                backgroundColor: '#f59e0b',
                borderColor: '#d97706',
                icon: '⚠️'
            },
            info: {
                backgroundColor: '#3b82f6',
                borderColor: '#2563eb',
                icon: 'ℹ️'
            }
        };
        this.init();
        console.log('🔔 Notification System initialized');
    }

    /**
     * Initialize the notification system
     */
    init() {
        if (typeof document === 'undefined') {
            console.warn('⚠️ Notification system requires DOM environment');
            return;
        }

        // Create notification container
        this.createContainer();
        
        // Add CSS styles
        this.addStyles();
        
        // Listen for API error handler events
        this.setupErrorHandlerIntegration();
        
        this.initialized = true;
        console.log('✅ Notification system ready');
    }

    /**
     * Create the notification container
     */
    createContainer() {
        // Remove existing container if present
        const existing = document.getElementById('notification-container');
        if (existing) {
            existing.remove();
        }

        this.container = document.createElement('div');
        this.container.id = 'notification-container';
        this.container.className = 'notification-container';
        
        // Position container
        this.container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            pointer-events: none;
            max-width: 400px;
        `;
        
        document.body.appendChild(this.container);
    }

    /**
     * Add CSS styles for notifications
     */
    addStyles() {
        const styleId = 'notification-system-styles';
        
        // Remove existing styles
        const existing = document.getElementById(styleId);
        if (existing) {
            existing.remove();
        }

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .notification {
                display: flex;
                align-items: flex-start;
                gap: 12px;
                padding: 16px;
                margin-bottom: 12px;
                border-radius: 8px;
                border-left: 4px solid;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                color: white;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
                line-height: 1.4;
                pointer-events: auto;
                transform: translateX(100%);
                opacity: 0;
                transition: all 0.3s ease-in-out;
                max-width: 100%;
                word-wrap: break-word;
            }
            
            .notification.show {
                transform: translateX(0);
                opacity: 1;
            }
            
            .notification.hide {
                transform: translateX(100%);
                opacity: 0;
            }
            
            .notification-icon {
                font-size: 18px;
                flex-shrink: 0;
                margin-top: 1px;
            }
            
            .notification-content {
                flex: 1;
                min-width: 0;
            }
            
            .notification-title {
                font-weight: 600;
                margin-bottom: 4px;
            }
            
            .notification-message {
                opacity: 0.95;
            }
            
            .notification-actions {
                margin-top: 8px;
                display: flex;
                gap: 8px;
            }
            
            .notification-button {
                background: rgba(255, 255, 255, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.3);
                color: white;
                padding: 4px 12px;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            
            .notification-button:hover {
                background: rgba(255, 255, 255, 0.3);
            }
            
            .notification-close {
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                font-size: 18px;
                padding: 0;
                margin-left: 8px;
                opacity: 0.7;
                transition: opacity 0.2s;
                flex-shrink: 0;
            }
            
            .notification-close:hover {
                opacity: 1;
            }
            
            .notification-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 2px;
                background: rgba(255, 255, 255, 0.3);
                transition: width linear;
            }
            
            @media (max-width: 480px) {
                .notification-container {
                    left: 20px;
                    right: 20px;
                    top: 20px;
                }
                
                .notification {
                    margin-bottom: 8px;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Setup integration with API error handler
     */
    setupErrorHandlerIntegration() {
        // Listen for API error handler events
        if (typeof window !== 'undefined' && window.apiErrorHandler) {
            window.apiErrorHandler.onError((error) => {
                this.showError(error.message || 'An error occurred', {
                    title: 'System Error',
                    details: error.code,
                    canRetry: error.canRetry,
                    recovery: error.recovery
                });
            });
        }
    }

    /**
     * Show a success notification
     */
    showSuccess(message, options = {}) {
        return this.show('success', message, {
            title: 'Success',
            duration: 4000,
            ...options
        });
    }

    /**
     * Show an error notification
     */
    showError(message, options = {}) {
        return this.show('error', message, {
            title: 'Error',
            duration: 8000,
            persistent: options.canRetry || false,
            ...options
        });
    }

    /**
     * Show a warning notification
     */
    showWarning(message, options = {}) {
        return this.show('warning', message, {
            title: 'Warning',
            duration: 6000,
            ...options
        });
    }

    /**
     * Show an info notification
     */
    showInfo(message, options = {}) {
        return this.show('info', message, {
            title: 'Information',
            duration: 5000,
            ...options
        });
    }

    /**
     * Show a notification with custom type and options
     */
    show(type, message, options = {}) {
        if (!this.initialized) {
            console.warn('⚠️ Notification system not initialized');
            return null;
        }

        const notification = {
            id: this.generateId(),
            type,
            message,
            title: options.title || this.capitalizeFirst(type),
            duration: options.duration || this.defaultDuration,
            persistent: options.persistent || false,
            actions: options.actions || [],
            details: options.details || null,
            canRetry: options.canRetry || false,
            recovery: options.recovery || null,
            onClose: options.onClose || null,
            element: null,
            timer: null
        };

        // Add to notifications array
        this.notifications.push(notification);

        // Create DOM element
        notification.element = this.createNotificationElement(notification);

        // Add to container
        this.container.appendChild(notification.element);

        // Trigger show animation
        setTimeout(() => {
            notification.element.classList.add('show');
        }, 10);

        // Auto-dismiss if not persistent
        if (!notification.persistent && notification.duration > 0) {
            this.scheduleAutoDismiss(notification);
        }

        // Limit number of notifications
        this.enforceMaxNotifications();

        console.log(`🔔 ${type.toUpperCase()} notification shown:`, message);
        return notification;
    }

    /**
     * Create notification DOM element
     */
    createNotificationElement(notification) {
        const element = document.createElement('div');
        element.className = 'notification';
        element.style.backgroundColor = this.styles[notification.type].backgroundColor;
        element.style.borderColor = this.styles[notification.type].borderColor;
        element.style.position = 'relative';

        const icon = document.createElement('div');
        icon.className = 'notification-icon';
        icon.textContent = this.styles[notification.type].icon;

        const content = document.createElement('div');
        content.className = 'notification-content';

        const title = document.createElement('div');
        title.className = 'notification-title';
        title.textContent = notification.title;

        const message = document.createElement('div');
        message.className = 'notification-message';
        message.textContent = notification.message;

        content.appendChild(title);
        content.appendChild(message);

        // Add details if present
        if (notification.details) {
            const details = document.createElement('div');
            details.className = 'notification-details';
            details.style.cssText = 'font-size: 12px; opacity: 0.8; margin-top: 4px;';
            details.textContent = `Details: ${notification.details}`;
            content.appendChild(details);
        }

        // Add actions if present
        if (notification.actions.length > 0 || notification.canRetry) {
            const actionsContainer = document.createElement('div');
            actionsContainer.className = 'notification-actions';

            // Add retry button if applicable
            if (notification.canRetry) {
                const retryButton = document.createElement('button');
                retryButton.className = 'notification-button';
                retryButton.textContent = 'Retry';
                retryButton.onclick = () => {
                    this.dismiss(notification.id);
                    if (notification.onRetry) {
                        notification.onRetry();
                    }
                };
                actionsContainer.appendChild(retryButton);
            }

            // Add custom actions
            notification.actions.forEach(action => {
                const button = document.createElement('button');
                button.className = 'notification-button';
                button.textContent = action.label;
                button.onclick = () => {
                    if (action.action) {
                        action.action();
                    }
                    if (action.dismiss !== false) {
                        this.dismiss(notification.id);
                    }
                };
                actionsContainer.appendChild(button);
            });

            content.appendChild(actionsContainer);
        }

        const closeButton = document.createElement('button');
        closeButton.className = 'notification-close';
        closeButton.innerHTML = '×';
        closeButton.onclick = () => this.dismiss(notification.id);

        element.appendChild(icon);
        element.appendChild(content);
        element.appendChild(closeButton);

        // Add progress bar for timed notifications
        if (!notification.persistent && notification.duration > 0) {
            const progress = document.createElement('div');
            progress.className = 'notification-progress';
            progress.style.width = '100%';
            element.appendChild(progress);

            // Animate progress bar
            setTimeout(() => {
                progress.style.width = '0%';
                progress.style.transition = `width ${notification.duration}ms linear`;
            }, 100);
        }

        return element;
    }

    /**
     * Schedule auto-dismiss for notification
     */
    scheduleAutoDismiss(notification) {
        notification.timer = setTimeout(() => {
            this.dismiss(notification.id);
        }, notification.duration);
    }

    /**
     * Dismiss a notification by ID
     */
    dismiss(id) {
        const notification = this.notifications.find(n => n.id === id);
        if (!notification) return;

        // Clear timer if exists
        if (notification.timer) {
            clearTimeout(notification.timer);
        }

        // Trigger hide animation
        if (notification.element) {
            notification.element.classList.add('hide');
            
            // Remove from DOM after animation
            setTimeout(() => {
                if (notification.element && notification.element.parentNode) {
                    notification.element.parentNode.removeChild(notification.element);
                }
            }, 300);
        }

        // Remove from notifications array
        this.notifications = this.notifications.filter(n => n.id !== id);

        // Call onClose callback
        if (notification.onClose) {
            notification.onClose();
        }

        console.log('🔔 Notification dismissed:', id);
    }

    /**
     * Dismiss all notifications
     */
    dismissAll() {
        const ids = this.notifications.map(n => n.id);
        ids.forEach(id => this.dismiss(id));
    }

    /**
     * Enforce maximum number of notifications
     */
    enforceMaxNotifications() {
        while (this.notifications.length > this.maxNotifications) {
            const oldest = this.notifications[0];
            this.dismiss(oldest.id);
        }
    }

    /**
     * Generate unique ID for notification
     */
    generateId() {
        return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Capitalize first letter of string
     */
    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Show loading notification
     */
    showLoading(message, options = {}) {
        return this.show('info', message, {
            title: 'Loading...',
            persistent: true,
            ...options
        });
    }

    /**
     * Update existing notification
     */
    update(id, updates) {
        const notification = this.notifications.find(n => n.id === id);
        if (!notification) return false;

        // Update notification properties
        Object.assign(notification, updates);

        // Update DOM element
        if (notification.element) {
            const titleElement = notification.element.querySelector('.notification-title');
            const messageElement = notification.element.querySelector('.notification-message');
            
            if (titleElement && updates.title) {
                titleElement.textContent = updates.title;
            }
            
            if (messageElement && updates.message) {
                messageElement.textContent = updates.message;
            }
        }

        return true;
    }

    /**
     * Get notification statistics
     */
    getStats() {
        return {
            total: this.notifications.length,
            byType: this.notifications.reduce((acc, n) => {
                acc[n.type] = (acc[n.type] || 0) + 1;
                return acc;
            }, {}),
            persistent: this.notifications.filter(n => n.persistent).length,
            initialized: this.initialized
        };
    }
}

// Create global instance
if (typeof window !== 'undefined') {
    window.notificationSystem = new NotificationSystem();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationSystem;
}
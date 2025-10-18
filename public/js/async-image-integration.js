/**
 * Async Image Integration for Case Study Editor
 * 
 * This module provides easy integration of AsyncImageLoader with the case study editor
 * to fix async loading issues, add loading states, and handle race conditions.
 * 
 * Requirements: 4.3 - Fix async image loading
 */

class AsyncImageIntegration {
    constructor() {
        this.loader = window.asyncImageLoader;
        this.loadingElements = new Map();
        this.imageQueue = new Map();
        
        if (!this.loader) {
            console.error('❌ AsyncImageLoader not found. Please include async-image-loader.js first.');
            return;
        }
        
        this.init();
    }

    init() {
        console.log('🔄 Initializing Async Image Integration...');
        
        // Setup automatic image loading for existing img elements
        this.setupAutoLoading();
        
        // Setup mutation observer for dynamically added images
        this.setupMutationObserver();
        
        // Add CSS for loading states
        this.addLoadingStyles();
        
        console.log('✅ Async Image Integration ready');
    }

    /**
     * Setup automatic loading for existing img elements with data-async attribute
     */
    setupAutoLoading() {
        const asyncImages = document.querySelectorAll('img[data-async]');
        
        asyncImages.forEach(img => {
            this.enhanceImageElement(img);
        });
        
        console.log(`🔄 Enhanced ${asyncImages.length} existing async images`);
    }

    /**
     * Setup mutation observer to handle dynamically added images
     */
    setupMutationObserver() {
        if (!window.MutationObserver) {
            console.warn('⚠️ MutationObserver not supported, dynamic image enhancement disabled');
            return;
        }

        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if the node itself is an async image
                        if (node.tagName === 'IMG' && node.hasAttribute('data-async')) {
                            this.enhanceImageElement(node);
                        }
                        
                        // Check for async images within the added node
                        const asyncImages = node.querySelectorAll && node.querySelectorAll('img[data-async]');
                        if (asyncImages) {
                            asyncImages.forEach(img => this.enhanceImageElement(img));
                        }
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('✅ Mutation observer setup for dynamic image enhancement');
    }

    /**
     * Enhance an image element with async loading capabilities
     */
    enhanceImageElement(imgElement) {
        if (imgElement.dataset.asyncEnhanced) {
            return; // Already enhanced
        }

        const originalSrc = imgElement.src || imgElement.dataset.src || imgElement.dataset.async;
        if (!originalSrc) {
            console.warn('⚠️ No source URL found for async image:', imgElement);
            return;
        }

        // Mark as enhanced
        imgElement.dataset.asyncEnhanced = 'true';
        
        // Store original src and clear it to prevent default loading
        imgElement.dataset.originalSrc = originalSrc;
        imgElement.removeAttribute('src');

        // Add loading state
        this.showLoadingState(imgElement);

        // Load image asynchronously
        this.loadImageAsync(imgElement, originalSrc);
    }

    /**
     * Load image asynchronously with proper error handling and loading states
     */
    async loadImageAsync(imgElement, url) {
        const loadingId = `loading-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        this.loadingElements.set(loadingId, imgElement);

        try {
            // Configure loading options
            const options = {
                showLoadingState: true,
                showProgress: imgElement.dataset.showProgress === 'true',
                fallbackUrl: imgElement.dataset.fallback || null,
                timeout: parseInt(imgElement.dataset.timeout) || 15000,
                enableRetry: imgElement.dataset.retry !== 'false',
                onLoadStart: (url) => {
                    this.onImageLoadStart(imgElement, url);
                },
                onProgress: (url, progress, status) => {
                    this.onImageProgress(imgElement, url, progress, status);
                },
                onLoadEnd: (url, success, error) => {
                    this.onImageLoadEnd(imgElement, url, success, error);
                    this.loadingElements.delete(loadingId);
                }
            };

            // Use race protection if specified
            if (imgElement.dataset.raceProtection === 'true') {
                await this.loader.loadImageWithRaceProtection(url, imgElement, options);
            } else {
                await this.loader.loadImageToElement(imgElement, url, options);
            }

        } catch (error) {
            console.error('❌ Failed to load async image:', error);
            this.showErrorState(imgElement, error.message);
            this.loadingElements.delete(loadingId);
        }
    }

    /**
     * Show loading state for an image
     */
    showLoadingState(imgElement) {
        imgElement.classList.add('async-loading');
        imgElement.classList.remove('async-loaded', 'async-error');
        
        // Set placeholder if not already set
        if (!imgElement.src) {
            imgElement.src = this.createLoadingPlaceholder();
        }

        // Add loading indicator if requested
        if (imgElement.dataset.showIndicator === 'true') {
            this.addLoadingIndicator(imgElement);
        }
    }

    /**
     * Show error state for an image
     */
    showErrorState(imgElement, errorMessage) {
        imgElement.classList.add('async-error');
        imgElement.classList.remove('async-loading', 'async-loaded');
        
        // Set error placeholder
        imgElement.src = imgElement.dataset.fallback || this.createErrorPlaceholder();
        
        // Store error message
        imgElement.dataset.errorMessage = errorMessage;
        
        // Remove loading indicator
        this.removeLoadingIndicator(imgElement);
    }

    /**
     * Show loaded state for an image
     */
    showLoadedState(imgElement) {
        imgElement.classList.add('async-loaded');
        imgElement.classList.remove('async-loading', 'async-error');
        
        // Remove loading indicator
        this.removeLoadingIndicator(imgElement);
        
        // Clear error message
        delete imgElement.dataset.errorMessage;
    }

    /**
     * Event handlers
     */
    onImageLoadStart(imgElement, url) {
        console.log('🔄 Starting async image load:', url);
        this.showLoadingState(imgElement);
        
        // Dispatch custom event
        imgElement.dispatchEvent(new CustomEvent('asyncImageLoadStart', {
            detail: { url }
        }));
    }

    onImageProgress(imgElement, url, progress, status) {
        // Update progress indicator if present
        const indicator = imgElement.parentElement?.querySelector('.async-loading-indicator');
        if (indicator && this.loader.updateLoadingIndicator) {
            this.loader.updateLoadingIndicator(indicator, progress, status);
        }
        
        // Update data attributes
        imgElement.dataset.loadProgress = progress;
        imgElement.dataset.loadStatus = status;
        
        // Dispatch custom event
        imgElement.dispatchEvent(new CustomEvent('asyncImageProgress', {
            detail: { url, progress, status }
        }));
    }

    onImageLoadEnd(imgElement, url, success, error) {
        if (success) {
            console.log('✅ Async image loaded successfully:', url);
            this.showLoadedState(imgElement);
            
            // Dispatch success event
            imgElement.dispatchEvent(new CustomEvent('asyncImageLoaded', {
                detail: { url }
            }));
        } else {
            console.error('❌ Async image failed to load:', error);
            this.showErrorState(imgElement, error?.message || 'Unknown error');
            
            // Dispatch error event
            imgElement.dispatchEvent(new CustomEvent('asyncImageError', {
                detail: { url, error: error?.message || 'Unknown error' }
            }));
        }
    }

    /**
     * Add loading indicator to image
     */
    addLoadingIndicator(imgElement) {
        // Don't add if already present
        if (imgElement.parentElement?.querySelector('.async-loading-indicator')) {
            return;
        }

        const indicator = this.loader.createLoadingIndicator({
            size: imgElement.dataset.indicatorSize || 'medium',
            text: imgElement.dataset.loadingText || 'Loading image...',
            showProgress: imgElement.dataset.showProgress === 'true'
        });

        indicator.classList.add('async-loading-indicator');
        
        // Position indicator over the image
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.style.display = 'inline-block';
        
        imgElement.parentNode.insertBefore(wrapper, imgElement);
        wrapper.appendChild(imgElement);
        
        indicator.style.position = 'absolute';
        indicator.style.top = '50%';
        indicator.style.left = '50%';
        indicator.style.transform = 'translate(-50%, -50%)';
        indicator.style.zIndex = '10';
        
        wrapper.appendChild(indicator);
    }

    /**
     * Remove loading indicator from image
     */
    removeLoadingIndicator(imgElement) {
        const wrapper = imgElement.parentElement;
        const indicator = wrapper?.querySelector('.async-loading-indicator');
        
        if (indicator) {
            indicator.remove();
            
            // Unwrap if wrapper was created by us
            if (wrapper && wrapper.children.length === 1 && wrapper.style.position === 'relative') {
                wrapper.parentNode.insertBefore(imgElement, wrapper);
                wrapper.remove();
            }
        }
    }

    /**
     * Create loading placeholder data URL
     */
    createLoadingPlaceholder() {
        return this.loader.getDefaultFallback();
    }

    /**
     * Create error placeholder data URL
     */
    createErrorPlaceholder() {
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 200;
        
        const ctx = canvas.getContext('2d');
        
        // Background
        ctx.fillStyle = '#fef2f2';
        ctx.fillRect(0, 0, 300, 200);
        
        // Border
        ctx.strokeStyle = '#fecaca';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, 300, 200);
        
        // Error icon (simple X)
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(130, 80);
        ctx.lineTo(170, 120);
        ctx.moveTo(170, 80);
        ctx.lineTo(130, 120);
        ctx.stroke();
        
        // Text
        ctx.fillStyle = '#dc2626';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Failed to load image', 150, 150);
        
        return canvas.toDataURL();
    }

    /**
     * Add CSS styles for loading states
     */
    addLoadingStyles() {
        if (document.getElementById('async-image-styles')) {
            return; // Already added
        }

        const styles = document.createElement('style');
        styles.id = 'async-image-styles';
        styles.textContent = `
            .async-loading {
                opacity: 0.7;
                filter: blur(1px);
                transition: opacity 0.3s ease, filter 0.3s ease;
            }
            
            .async-loaded {
                opacity: 1;
                filter: none;
                transition: opacity 0.3s ease, filter 0.3s ease;
            }
            
            .async-error {
                opacity: 0.8;
                filter: grayscale(50%);
                border: 2px dashed #ef4444;
                transition: opacity 0.3s ease, filter 0.3s ease;
            }
            
            .async-loading-indicator {
                background: rgba(255, 255, 255, 0.9);
                border-radius: 8px;
                backdrop-filter: blur(4px);
            }
            
            @keyframes async-pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
            
            .async-loading::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
                animation: async-pulse 1.5s infinite;
                pointer-events: none;
            }
        `;
        
        document.head.appendChild(styles);
        console.log('✅ Async image loading styles added');
    }

    /**
     * Utility methods for manual integration
     */
    
    /**
     * Manually load an image with async handling
     */
    async loadImage(url, targetElementId, options = {}) {
        const element = document.getElementById(targetElementId);
        if (!element) {
            throw new Error(`Element not found: ${targetElementId}`);
        }

        return await this.loadImageAsync(element, url);
    }

    /**
     * Load multiple images in a gallery
     */
    async loadGallery(imageUrls, containerSelector, options = {}) {
        return await this.loader.loadGalleryImages(imageUrls, containerSelector, options);
    }

    /**
     * Get loading statistics
     */
    getStats() {
        return {
            ...this.loader.getStats(),
            activeLoadingElements: this.loadingElements.size,
            queuedImages: this.imageQueue.size
        };
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.asyncImageIntegration = new AsyncImageIntegration();
    });
} else {
    window.asyncImageIntegration = new AsyncImageIntegration();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AsyncImageIntegration;
}
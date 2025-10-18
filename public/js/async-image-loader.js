/**
 * Async Image Loader
 * 
 * Handles proper promise handling, loading states, and race conditions
 * for image loading operations across the SaaS system
 * 
 * Requirements: 4.3
 */

class AsyncImageLoader {
    constructor() {
        this.loadingPromises = new Map();
        this.loadedImages = new Map();
        this.failedImages = new Set();
        this.loadingStates = new Map();
        
        this.config = {
            timeout: 15000, // 15 seconds
            retryAttempts: 2,
            retryDelay: 1000,
            cacheExpiry: 300000 // 5 minutes
        };
        
        this.init();
    }

    init() {
        console.log('🔄 Async Image Loader initialized');
        
        // Setup periodic cleanup
        setInterval(() => {
            this.cleanupCache();
        }, 60000); // Cleanup every minute
    }

    /**
     * Load image with proper async handling and race condition prevention
     */
    async loadImage(url, options = {}) {
        const {
            fallbackUrl = null,
            timeout = this.config.timeout,
            enableCache = true,
            enableRetry = true,
            onProgress = null,
            onLoadStart = null,
            onLoadEnd = null
        } = options;

        if (!url) {
            return fallbackUrl || this.getDefaultFallback();
        }

        // Notify load start
        if (onLoadStart) {
            onLoadStart(url);
        }

        // Update loading state
        this.loadingStates.set(url, {
            status: 'starting',
            startTime: Date.now(),
            progress: 0
        });

        try {
            // Check cache first
            if (enableCache && this.loadedImages.has(url)) {
                const cached = this.loadedImages.get(url);
                if (Date.now() - cached.timestamp < this.config.cacheExpiry) {
                    console.log('✅ Image loaded from cache:', url);
                    this.loadingStates.set(url, {
                        status: 'completed',
                        startTime: cached.timestamp,
                        progress: 100
                    });
                    if (onLoadEnd) onLoadEnd(url, true);
                    return cached.result;
                }
            }

            // Check if already loading (prevent race conditions)
            if (this.loadingPromises.has(url)) {
                console.log('🔄 Image already loading, waiting for existing promise:', url);
                const existingPromise = this.loadingPromises.get(url);
                
                // Wait for existing promise and notify completion
                const result = await existingPromise;
                if (onLoadEnd) onLoadEnd(url, true);
                return result;
            }

            // Update loading state
            this.loadingStates.set(url, {
                status: 'loading',
                startTime: Date.now(),
                progress: 10
            });

            // Create loading promise with progress tracking
            const loadingPromise = this.performImageLoadWithProgress(url, {
                fallbackUrl,
                timeout,
                enableRetry,
                onProgress
            });

            // Store promise to prevent race conditions
            this.loadingPromises.set(url, loadingPromise);

            const result = await loadingPromise;
            
            // Cache successful result
            if (enableCache) {
                this.loadedImages.set(url, {
                    result,
                    timestamp: Date.now()
                });
            }

            // Update final state
            this.loadingStates.set(url, {
                status: 'completed',
                startTime: this.loadingStates.get(url)?.startTime || Date.now(),
                progress: 100,
                completedAt: Date.now()
            });

            if (onLoadEnd) onLoadEnd(url, true);
            return result;
            
        } catch (error) {
            // Mark as failed
            this.failedImages.add(url);
            
            // Update error state
            this.loadingStates.set(url, {
                status: 'failed',
                startTime: this.loadingStates.get(url)?.startTime || Date.now(),
                progress: 0,
                error: error.message,
                failedAt: Date.now()
            });

            if (onLoadEnd) onLoadEnd(url, false, error);
            throw error;
            
        } finally {
            // Cleanup loading promise
            this.loadingPromises.delete(url);
        }
    }

    /**
     * Perform the actual image loading with timeout, retry, and progress tracking
     */
    async performImageLoadWithProgress(url, options = {}) {
        const { fallbackUrl, timeout, enableRetry, onProgress } = options;
        const maxAttempts = enableRetry ? this.config.retryAttempts : 1;
        let lastError;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                console.log(`🔄 Loading image attempt ${attempt}/${maxAttempts}:`, url);
                
                // Update progress for retry attempts
                if (onProgress) {
                    const baseProgress = 20 + (attempt - 1) * 20; // 20%, 40%, 60% for attempts
                    onProgress(url, baseProgress);
                }

                const result = await this.loadImageWithTimeoutAndProgress(url, timeout, onProgress);
                
                console.log('✅ Image loaded successfully on attempt:', attempt);
                return result;
                
            } catch (error) {
                lastError = error;
                console.error(`❌ Image load attempt ${attempt} failed:`, error.message);
                
                if (attempt < maxAttempts) {
                    console.log(`⏳ Retrying in ${this.config.retryDelay * attempt}ms...`);
                    await this.delay(this.config.retryDelay * attempt);
                }
            }
        }

        // All attempts failed, use fallback
        console.warn('⚠️ All image load attempts failed, using fallback:', url);
        if (onProgress) {
            onProgress(url, 100, 'fallback');
        }
        return fallbackUrl || this.getDefaultFallback();
    }

    /**
     * Load image with timeout and progress tracking
     */
    loadImageWithTimeoutAndProgress(url, timeout, onProgress = null) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            let progressInterval;
            let startTime = Date.now();
            
            // Setup timeout
            const timeoutId = setTimeout(() => {
                if (progressInterval) clearInterval(progressInterval);
                reject(new Error(`Image load timeout after ${timeout}ms`));
            }, timeout);
            
            // Setup progress simulation (since we can't track actual image loading progress)
            if (onProgress) {
                let progress = 30; // Start at 30% when loading begins
                progressInterval = setInterval(() => {
                    if (progress < 90) {
                        progress += Math.random() * 10; // Increment by 0-10%
                        progress = Math.min(progress, 90); // Cap at 90% until complete
                        onProgress(url, Math.floor(progress));
                    }
                }, 100); // Update every 100ms
            }
            
            img.onload = () => {
                clearTimeout(timeoutId);
                if (progressInterval) clearInterval(progressInterval);
                
                const loadTime = Date.now() - startTime;
                console.log(`✅ Image loaded in ${loadTime}ms:`, url);
                
                if (onProgress) {
                    onProgress(url, 100, 'completed');
                }
                
                resolve(url);
            };
            
            img.onerror = (error) => {
                clearTimeout(timeoutId);
                if (progressInterval) clearInterval(progressInterval);
                
                const errorMsg = `Image failed to load: ${url}`;
                console.error('❌', errorMsg, error);
                
                if (onProgress) {
                    onProgress(url, 0, 'error');
                }
                
                reject(new Error(errorMsg));
            };
            
            // Start loading
            img.src = url;
            
            // Initial progress update
            if (onProgress) {
                onProgress(url, 30, 'loading');
            }
        });
    }

    /**
     * Legacy method for backward compatibility
     */
    loadImageWithTimeout(url, timeout) {
        return this.loadImageWithTimeoutAndProgress(url, timeout);
    }

    /**
     * Batch load multiple images with proper async handling
     */
    async loadImages(urls, options = {}) {
        const {
            concurrent = 3, // Load 3 images at a time
            failFast = false
        } = options;

        console.log(`🔄 Batch loading ${urls.length} images with concurrency ${concurrent}`);
        
        const results = [];
        const errors = [];

        // Process in batches to avoid overwhelming the browser
        for (let i = 0; i < urls.length; i += concurrent) {
            const batch = urls.slice(i, i + concurrent);
            
            const batchPromises = batch.map(async (url, index) => {
                try {
                    const result = await this.loadImage(url, options);
                    return { index: i + index, url, result, success: true };
                } catch (error) {
                    const errorResult = { index: i + index, url, error: error.message, success: false };
                    
                    if (failFast) {
                        throw errorResult;
                    }
                    
                    return errorResult;
                }
            });

            const batchResults = await Promise.allSettled(batchPromises);
            
            batchResults.forEach(promiseResult => {
                if (promiseResult.status === 'fulfilled') {
                    const result = promiseResult.value;
                    if (result.success) {
                        results.push(result);
                    } else {
                        errors.push(result);
                    }
                } else {
                    errors.push({
                        error: promiseResult.reason.message || 'Unknown error',
                        success: false
                    });
                }
            });
        }

        return {
            success: errors.length === 0,
            results,
            errors,
            loaded: results.length,
            failed: errors.length
        };
    }

    /**
     * Preload images for better performance
     */
    async preloadImages(urls, priority = 'low') {
        console.log(`🔄 Preloading ${urls.length} images with priority ${priority}`);
        
        const preloadPromises = urls.map(url => {
            return new Promise((resolve) => {
                const link = document.createElement('link');
                link.rel = 'preload';
                link.as = 'image';
                link.href = url;
                
                if (priority === 'high') {
                    link.fetchPriority = 'high';
                }
                
                link.onload = () => {
                    console.log('✅ Image preloaded:', url);
                    resolve({ url, success: true });
                };
                
                link.onerror = () => {
                    console.warn('⚠️ Failed to preload image:', url);
                    resolve({ url, success: false });
                };
                
                document.head.appendChild(link);
                
                // Cleanup after 30 seconds
                setTimeout(() => {
                    if (link.parentNode) {
                        link.parentNode.removeChild(link);
                    }
                }, 30000);
            });
        });

        const results = await Promise.allSettled(preloadPromises);
        
        return {
            preloaded: results.filter(r => r.status === 'fulfilled' && r.value.success).length,
            failed: results.filter(r => r.status === 'rejected' || !r.value.success).length
        };
    }

    /**
     * Get detailed loading state for an image
     */
    getLoadingState(url) {
        if (this.loadingStates.has(url)) {
            return this.loadingStates.get(url);
        }
        
        // Legacy state detection for backward compatibility
        if (this.loadedImages.has(url)) {
            return { status: 'loaded', progress: 100 };
        } else if (this.loadingPromises.has(url)) {
            return { status: 'loading', progress: 50 };
        } else if (this.failedImages.has(url)) {
            return { status: 'failed', progress: 0 };
        } else {
            return { status: 'pending', progress: 0 };
        }
    }

    /**
     * Load image with DOM element integration and loading states
     */
    async loadImageToElement(imgElement, url, options = {}) {
        const {
            showLoadingState = true,
            showProgress = false,
            fallbackUrl = null,
            onLoadStart = null,
            onLoadEnd = null,
            loadingClass = 'loading',
            errorClass = 'error',
            loadedClass = 'loaded'
        } = options;

        if (!imgElement || !url) {
            console.error('❌ Invalid image element or URL provided');
            return false;
        }

        try {
            // Add loading class
            if (showLoadingState) {
                imgElement.classList.add(loadingClass);
                imgElement.classList.remove(errorClass, loadedClass);
            }

            // Create progress callback if needed
            let progressCallback = null;
            if (showProgress && imgElement.dataset) {
                progressCallback = (url, progress, status) => {
                    imgElement.dataset.progress = progress;
                    imgElement.dataset.status = status;
                    
                    // Dispatch custom event for progress updates
                    imgElement.dispatchEvent(new CustomEvent('imageLoadProgress', {
                        detail: { url, progress, status }
                    }));
                };
            }

            // Load image with progress tracking
            const loadedUrl = await this.loadImage(url, {
                ...options,
                onProgress: progressCallback,
                onLoadStart: onLoadStart,
                onLoadEnd: onLoadEnd
            });

            // Update image element
            imgElement.src = loadedUrl;
            
            if (showLoadingState) {
                imgElement.classList.remove(loadingClass);
                imgElement.classList.add(loadedClass);
            }

            // Clear progress data
            if (imgElement.dataset) {
                delete imgElement.dataset.progress;
                delete imgElement.dataset.status;
            }

            console.log('✅ Image loaded to element:', url);
            return true;

        } catch (error) {
            console.error('❌ Failed to load image to element:', error);
            
            // Set fallback or error state
            if (fallbackUrl) {
                imgElement.src = fallbackUrl;
            } else {
                imgElement.src = this.getDefaultFallback();
            }

            if (showLoadingState) {
                imgElement.classList.remove(loadingClass);
                imgElement.classList.add(errorClass);
            }

            // Clear progress data
            if (imgElement.dataset) {
                imgElement.dataset.progress = '0';
                imgElement.dataset.status = 'error';
            }

            return false;
        }
    }

    /**
     * Load multiple images to elements with coordination
     */
    async loadImagesToElements(imageConfigs, options = {}) {
        const {
            concurrent = 3,
            onBatchProgress = null,
            onImageComplete = null
        } = options;

        console.log(`🔄 Loading ${imageConfigs.length} images to elements with concurrency ${concurrent}`);
        
        const results = [];
        let completed = 0;

        // Process in batches to avoid overwhelming the browser
        for (let i = 0; i < imageConfigs.length; i += concurrent) {
            const batch = imageConfigs.slice(i, i + concurrent);
            
            const batchPromises = batch.map(async (config, batchIndex) => {
                const { element, url, options: configOptions = {} } = config;
                const globalIndex = i + batchIndex;
                
                try {
                    const success = await this.loadImageToElement(element, url, {
                        ...options,
                        ...configOptions,
                        onLoadEnd: (loadedUrl, success, error) => {
                            completed++;
                            
                            if (onImageComplete) {
                                onImageComplete(globalIndex, url, success, error);
                            }
                            
                            if (onBatchProgress) {
                                onBatchProgress(completed, imageConfigs.length, (completed / imageConfigs.length) * 100);
                            }
                        }
                    });
                    
                    return { index: globalIndex, url, element, success, error: null };
                    
                } catch (error) {
                    completed++;
                    
                    if (onImageComplete) {
                        onImageComplete(globalIndex, url, false, error);
                    }
                    
                    if (onBatchProgress) {
                        onBatchProgress(completed, imageConfigs.length, (completed / imageConfigs.length) * 100);
                    }
                    
                    return { index: globalIndex, url, element, success: false, error: error.message };
                }
            });

            const batchResults = await Promise.allSettled(batchPromises);
            
            batchResults.forEach(promiseResult => {
                if (promiseResult.status === 'fulfilled') {
                    results.push(promiseResult.value);
                } else {
                    results.push({
                        success: false,
                        error: promiseResult.reason.message || 'Unknown error'
                    });
                }
            });
        }

        const successful = results.filter(r => r.success).length;
        const failed = results.length - successful;

        console.log(`✅ Batch loading complete: ${successful} successful, ${failed} failed`);

        return {
            success: failed === 0,
            results,
            successful,
            failed,
            total: results.length
        };
    }

    /**
     * Clear cache for specific URL or all URLs
     */
    clearCache(url = null) {
        if (url) {
            this.loadedImages.delete(url);
            this.failedImages.delete(url);
            this.loadingPromises.delete(url);
        } else {
            this.loadedImages.clear();
            this.failedImages.clear();
            this.loadingPromises.clear();
        }
        
        console.log('✅ Image cache cleared:', url || 'all');
    }

    /**
     * Cleanup expired cache entries
     */
    cleanupCache() {
        const now = Date.now();
        let cleaned = 0;
        
        for (const [url, cached] of this.loadedImages) {
            if (now - cached.timestamp > this.config.cacheExpiry) {
                this.loadedImages.delete(url);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            console.log(`🧹 Cleaned up ${cleaned} expired cache entries`);
        }
    }

    /**
     * Get default fallback image
     */
    getDefaultFallback() {
        if (window.imageFlowStabilizer && window.imageFlowStabilizer.fallbackImages) {
            return window.imageFlowStabilizer.fallbackImages.placeholder;
        }
        
        // Create simple fallback
        return this.createSimpleFallback();
    }

    /**
     * Create simple fallback image
     */
    createSimpleFallback(width = 300, height = 200, text = 'Image') {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        
        // Background
        ctx.fillStyle = '#f9fafb';
        ctx.fillRect(0, 0, width, height);
        
        // Border
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, width, height);
        
        // Text
        ctx.fillStyle = '#9ca3af';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, width / 2, height / 2);
        
        return canvas.toDataURL();
    }

    /**
     * Delay utility
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Handle race conditions for rapid image updates (e.g., in editors)
     */
    async loadImageWithRaceProtection(url, targetElement, options = {}) {
        const {
            debounceMs = 300,
            cancelPrevious = true,
            loadingPlaceholder = null
        } = options;

        // Generate unique request ID
        const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Store request ID on element to track latest request
        if (targetElement) {
            targetElement.dataset.latestRequestId = requestId;
            
            // Show loading placeholder immediately
            if (loadingPlaceholder) {
                targetElement.src = loadingPlaceholder;
            }
        }

        // Debounce rapid requests
        if (debounceMs > 0) {
            await this.delay(debounceMs);
            
            // Check if this is still the latest request
            if (targetElement && targetElement.dataset.latestRequestId !== requestId) {
                console.log('🚫 Request cancelled due to newer request:', url);
                return null;
            }
        }

        // Cancel previous loading if requested
        if (cancelPrevious && this.loadingPromises.has(url)) {
            console.log('🚫 Cancelling previous load for:', url);
            this.loadingPromises.delete(url);
        }

        try {
            const result = await this.loadImage(url, options);
            
            // Final check - only update if this is still the latest request
            if (targetElement && targetElement.dataset.latestRequestId === requestId) {
                targetElement.src = result;
                delete targetElement.dataset.latestRequestId;
                console.log('✅ Race-protected image load completed:', url);
                return result;
            } else {
                console.log('🚫 Request outdated, not updating element:', url);
                return null;
            }
            
        } catch (error) {
            // Only show error if this is still the latest request
            if (targetElement && targetElement.dataset.latestRequestId === requestId) {
                targetElement.src = this.getDefaultFallback();
                delete targetElement.dataset.latestRequestId;
            }
            throw error;
        }
    }

    /**
     * Create loading state indicator element
     */
    createLoadingIndicator(options = {}) {
        const {
            size = 'medium',
            text = 'Loading...',
            showProgress = false,
            className = ''
        } = options;

        const indicator = document.createElement('div');
        indicator.className = `async-image-loading-indicator ${className}`;
        
        const sizeClasses = {
            small: 'w-4 h-4',
            medium: 'w-8 h-8', 
            large: 'w-12 h-12'
        };

        indicator.innerHTML = `
            <div class="flex flex-col items-center justify-center p-4">
                <div class="animate-spin rounded-full ${sizeClasses[size]} border-b-2 border-blue-500 mb-2"></div>
                <span class="text-sm text-gray-600">${text}</span>
                ${showProgress ? '<div class="w-full bg-gray-200 rounded-full h-2 mt-2"><div class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: 0%"></div></div>' : ''}
            </div>
        `;

        return indicator;
    }

    /**
     * Update loading indicator progress
     */
    updateLoadingIndicator(indicator, progress, status = 'loading') {
        const progressBar = indicator.querySelector('.bg-blue-600');
        const textElement = indicator.querySelector('.text-sm');
        
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
        
        if (textElement) {
            const statusTexts = {
                loading: 'Loading...',
                completed: 'Complete!',
                error: 'Error loading',
                fallback: 'Using fallback'
            };
            textElement.textContent = statusTexts[status] || `Loading... ${progress}%`;
        }
    }

    /**
     * Get comprehensive statistics
     */
    getStats() {
        const loadingStatesArray = Array.from(this.loadingStates.values());
        const activeLoading = loadingStatesArray.filter(state => state.status === 'loading').length;
        const completed = loadingStatesArray.filter(state => state.status === 'completed').length;
        const failed = loadingStatesArray.filter(state => state.status === 'failed').length;

        return {
            cached: this.loadedImages.size,
            loading: this.loadingPromises.size,
            activeLoading,
            completed,
            failed: this.failedImages.size,
            totalStates: this.loadingStates.size,
            config: this.config,
            memoryUsage: {
                loadedImages: this.loadedImages.size,
                loadingPromises: this.loadingPromises.size,
                loadingStates: this.loadingStates.size,
                failedImages: this.failedImages.size
            }
        };
    }
}

// Create global instance
if (typeof window !== 'undefined') {
    window.asyncImageLoader = new AsyncImageLoader();
    
    // Add helper functions for case study editor integration
    window.asyncImageLoader.loadCaseStudyImage = async function(imageUrl, targetElementId, options = {}) {
        const element = document.getElementById(targetElementId);
        if (!element) {
            console.error('❌ Target element not found:', targetElementId);
            return false;
        }

        const defaultOptions = {
            showLoadingState: true,
            showProgress: true,
            fallbackUrl: this.getDefaultFallback(),
            loadingClass: 'loading-image',
            errorClass: 'error-image',
            loadedClass: 'loaded-image',
            onLoadStart: (url) => {
                console.log('🔄 Starting to load case study image:', url);
                element.classList.add('opacity-50');
            },
            onLoadEnd: (url, success, error) => {
                element.classList.remove('opacity-50');
                if (success) {
                    console.log('✅ Case study image loaded successfully:', url);
                } else {
                    console.error('❌ Case study image failed to load:', error);
                }
            }
        };

        return await this.loadImageToElement(element, imageUrl, { ...defaultOptions, ...options });
    };

    // Helper for gallery images with race condition protection
    window.asyncImageLoader.loadGalleryImages = async function(imageUrls, containerSelector, options = {}) {
        const container = document.querySelector(containerSelector);
        if (!container) {
            console.error('❌ Gallery container not found:', containerSelector);
            return false;
        }

        // Clear existing content
        container.innerHTML = '';

        // Create image elements
        const imageConfigs = imageUrls.map((url, index) => {
            const imgElement = document.createElement('img');
            imgElement.className = 'gallery-image w-full h-64 object-cover rounded-lg transition-all duration-300';
            imgElement.alt = `Gallery image ${index + 1}`;
            imgElement.dataset.index = index;
            
            // Add to container immediately
            const wrapper = document.createElement('div');
            wrapper.className = 'gallery-image-wrapper overflow-hidden rounded-lg shadow-md hover:shadow-lg transition-shadow';
            wrapper.appendChild(imgElement);
            container.appendChild(wrapper);

            return {
                element: imgElement,
                url: url,
                options: {
                    showLoadingState: true,
                    showProgress: false,
                    fallbackUrl: this.getDefaultFallback()
                }
            };
        });

        // Load all images with coordination
        return await this.loadImagesToElements(imageConfigs, {
            concurrent: 3,
            onBatchProgress: (completed, total, percentage) => {
                console.log(`📊 Gallery loading progress: ${completed}/${total} (${percentage.toFixed(1)}%)`);
                
                // Dispatch progress event
                container.dispatchEvent(new CustomEvent('galleryLoadProgress', {
                    detail: { completed, total, percentage }
                }));
            },
            onImageComplete: (index, url, success, error) => {
                const wrapper = container.children[index];
                if (wrapper) {
                    if (success) {
                        wrapper.classList.add('loaded');
                    } else {
                        wrapper.classList.add('error');
                        console.warn(`⚠️ Gallery image ${index} failed to load:`, error);
                    }
                }
            },
            ...options
        });
    };

    // Helper for preview images with race condition protection
    window.asyncImageLoader.loadPreviewImage = async function(imageUrl, targetElementId, options = {}) {
        const element = document.getElementById(targetElementId);
        if (!element) {
            console.error('❌ Preview element not found:', targetElementId);
            return false;
        }

        return await this.loadImageWithRaceProtection(imageUrl, element, {
            debounceMs: 200, // Debounce rapid preview updates
            cancelPrevious: true,
            loadingPlaceholder: this.getDefaultFallback(),
            ...options
        });
    };

    console.log('✅ AsyncImageLoader helpers initialized for case study editor');
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AsyncImageLoader;
}
/**
 * Advanced Image Preview System
 * Senior Software Engineer Implementation
 * Features: Responsive sizing, blur preview, error handling, memory management
 */

class AdvancedImagePreview {
    constructor() {
        this.imageCache = new Map();
        this.objectUrls = new Set(); // Track object URLs for cleanup
        this.loadingImages = new Map();
        this.retryAttempts = new Map();
        this.maxRetries = 3;
        
        // Configuration
        this.config = {
            blurPreview: true,
            lazyLoading: true,
            maxImageSize: 10 * 1024 * 1024, // 10MB
            supportedFormats: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
            aspectRatios: {
                '16:9': { class: 'aspect-video', ratio: 16/9 },
                '4:3': { class: 'aspect-[4/3]', ratio: 4/3 },
                '1:1': { class: 'aspect-square', ratio: 1 },
                '3:2': { class: 'aspect-[3/2]', ratio: 3/2 },
                'auto': { class: '', ratio: null }, // No fixed aspect ratio
                'detect': { class: '', ratio: 'detect' } // Auto-detect from image
            },
            cloudinaryTransformations: {
                thumbnail: 'c_fill,w_400,h_300,q_auto,f_auto',
                preview: 'c_fit,w_800,h_600,q_auto,f_auto',
                blur: 'c_fill,w_50,h_50,q_auto,f_auto,e_blur:1000',
                fullsize: 'c_limit,w_1920,h_1080,q_auto,f_auto'
            }
        };
        
        this.init();
    }

    init() {
        console.log('🖼️ Initializing Advanced Image Preview System...');
        this.setupIntersectionObserver();
        this.setupCleanupHandlers();
        console.log('✅ Advanced Image Preview System ready');
    }

    /**
     * Generate responsive image preview with blur loading and error handling
     */
    generateImagePreview(imageSource, altText, section, options = {}) {
        const {
            aspectRatio = 'auto', // Default to auto aspect ratio
            showBlurPreview = this.config.blurPreview,
            lazyLoad = this.config.lazyLoading,
            maxWidth = null,
            className = '',
            onClick = null
        } = options;

        const previewId = this.generatePreviewId(section, imageSource);
        
        try {
            // Handle different image source types
            if (this.isPendingUpload(imageSource)) {
                return this.handlePendingUpload(imageSource, altText, section, options);
            } else if (this.isFile(imageSource)) {
                return this.handleFilePreview(imageSource, altText, options);
            } else if (this.isUrl(imageSource)) {
                return this.handleUrlPreview(imageSource, altText, options);
            } else {
                return this.createPlaceholder(altText, aspectRatio, 'No image selected');
            }
        } catch (error) {
            console.error('❌ Error generating image preview:', error);
            return this.createErrorPlaceholder(altText, aspectRatio, error.message);
        }
    }

    /**
     * Handle pending upload images
     */
    handlePendingUpload(imageSource, altText, section, options) {
        const pendingImage = this.getPendingImageData(imageSource, section);
        
        if (pendingImage && pendingImage.file) {
            return this.handleFilePreview(pendingImage.file, altText, options);
        }
        
        return this.createPlaceholder(altText, options.aspectRatio, 'Image selected - will upload on save');
    }

    /**
     * Handle file preview with object URL
     */
    handleFilePreview(file, altText, options) {
        // Validate file
        if (!this.validateImageFile(file)) {
            return this.createErrorPlaceholder(altText, options.aspectRatio, 'Invalid image file');
        }

        // Create object URL and track it for cleanup
        const objectUrl = URL.createObjectURL(file);
        this.objectUrls.add(objectUrl);

        // Generate blur preview if enabled
        const blurPreview = options.showBlurPreview ? this.generateBlurPreview(file) : null;

        return this.createImageHTML(objectUrl, altText, options, {
            isPending: true,
            blurPreview,
            fileSize: this.formatFileSize(file.size),
            fileName: file.name
        });
    }

    /**
     * Handle URL preview with Cloudinary optimizations
     */
    handleUrlPreview(imageUrl, altText, options) {
        const optimizedUrl = this.optimizeImageUrl(imageUrl, 'preview');
        const blurUrl = options.showBlurPreview ? this.optimizeImageUrl(imageUrl, 'blur') : null;

        return this.createImageHTML(optimizedUrl, altText, options, {
            isPending: false,
            blurPreview: blurUrl,
            originalUrl: imageUrl
        });
    }

    /**
     * Create responsive image HTML with advanced features
     */
    createImageHTML(src, alt, options, metadata = {}) {
        const {
            aspectRatio = 'auto',
            maxWidth = null,
            className = '',
            onClick = null,
            lazyLoad = true
        } = options;

        const previewId = `img-preview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Handle auto aspect ratio
        let aspectConfig;
        let containerStyle = '';
        
        if (aspectRatio === 'auto' || aspectRatio === 'detect') {
            // Use flexible container that adapts to image dimensions
            aspectConfig = { class: '', ratio: null };
            containerStyle = 'min-h-[200px] max-h-[600px]'; // Reasonable bounds
        } else {
            aspectConfig = this.config.aspectRatios[aspectRatio] || this.config.aspectRatios['16:9'];
        }
        
        // Build container classes
        const containerClasses = [
            'relative',
            aspectConfig.class,
            containerStyle,
            'w-full',
            'mb-3',
            'rounded-lg',
            'overflow-hidden',
            'bg-gray-100',
            'group',
            'transition-all',
            'duration-300',
            'hover:shadow-lg',
            maxWidth ? `max-w-[${maxWidth}]` : '',
            className
        ].filter(Boolean).join(' ');

        // Build image classes based on aspect ratio
        let imageClasses, imageStyle = '';
        
        if (aspectRatio === 'auto' || aspectRatio === 'detect') {
            // For auto aspect ratio, let image determine its own size
            imageClasses = [
                'w-full',
                'h-auto',
                'max-h-[600px]',
                'object-contain', // Maintain aspect ratio
                'transition-all',
                'duration-500',
                'group-hover:scale-105'
            ].join(' ');
        } else {
            // For fixed aspect ratios, use absolute positioning
            imageClasses = [
                'absolute',
                'inset-0',
                'w-full',
                'h-full',
                'object-cover',
                'transition-all',
                'duration-500',
                'group-hover:scale-105'
            ].join(' ');
        }

        // Generate blur preview overlay
        const blurOverlay = metadata.blurPreview ? `
            <div class="absolute inset-0 bg-cover bg-center transition-opacity duration-500 blur-preview-overlay"
                 style="background-image: url('${metadata.blurPreview}'); filter: blur(10px) brightness(0.8);">
            </div>
        ` : '';

        // Generate status indicators
        const statusIndicators = this.generateStatusIndicators(metadata);

        // Generate loading placeholder
        const loadingPlaceholder = `
            <div class="absolute inset-0 flex items-center justify-center bg-gray-100 loading-placeholder">
                <div class="text-center text-gray-500">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                    <p class="text-sm">Loading image...</p>
                </div>
            </div>
        `;

        // Generate error fallback
        const errorFallback = this.createErrorPlaceholder(alt, aspectRatio, 'Failed to load image');

        return `
            <div id="${previewId}" class="${containerClasses}" ${onClick ? `onclick="${onClick}"` : ''}>
                ${aspectRatio === 'auto' || aspectRatio === 'detect' ? '' : blurOverlay}
                ${loadingPlaceholder}
                <img 
                    ${lazyLoad ? 'data-src' : 'src'}="${this.escapeHtml(src)}" 
                    alt="${this.escapeHtml(alt)}" 
                    class="${imageClasses} opacity-0"
                    onload="
                        this.style.opacity='1'; 
                        this.parentElement.querySelector('.loading-placeholder')?.remove(); 
                        this.parentElement.querySelector('.blur-preview-overlay')?.style.setProperty('opacity', '0');
                        ${aspectRatio === 'auto' || aspectRatio === 'detect' ? 'window.advancedImagePreview.adjustContainerHeight(this);' : ''}
                    "
                    onerror="this.parentElement.innerHTML='${errorFallback.replace(/'/g, '\\\'')}';"
                    loading="${lazyLoad ? 'lazy' : 'eager'}"
                    decoding="async"
                    ${imageStyle ? `style="${imageStyle}"` : ''}
                >
                ${statusIndicators}
                ${this.generateImageControls(previewId, metadata)}
            </div>
        `;
    }

    /**
     * Generate status indicators (pending, file size, etc.)
     */
    generateStatusIndicators(metadata) {
        const indicators = [];

        if (metadata.isPending) {
            indicators.push(`
                <div class="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium z-10">
                    <i class="fas fa-clock mr-1"></i>Pending
                </div>
            `);
        }

        if (metadata.fileSize) {
            indicators.push(`
                <div class="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs z-10">
                    ${metadata.fileSize}
                </div>
            `);
        }

        return indicators.join('');
    }

    /**
     * Generate image controls (zoom, download, etc.)
     */
    generateImageControls(previewId, metadata) {
        return `
            <div class="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex space-x-1 z-10">
                <button onclick="window.advancedImagePreview.zoomImage('${previewId}')" 
                        class="bg-black bg-opacity-50 text-white p-1 rounded hover:bg-opacity-75 transition-all">
                    <i class="fas fa-search-plus text-xs"></i>
                </button>
                ${metadata.originalUrl ? `
                    <button onclick="window.advancedImagePreview.downloadImage('${metadata.originalUrl}')" 
                            class="bg-black bg-opacity-50 text-white p-1 rounded hover:bg-opacity-75 transition-all">
                        <i class="fas fa-download text-xs"></i>
                    </button>
                ` : ''}
            </div>
        `;
    }

    /**
     * Create placeholder for missing images
     */
    createPlaceholder(alt, aspectRatio, message = 'No image') {
        const aspectConfig = this.config.aspectRatios[aspectRatio] || this.config.aspectRatios['16:9'];
        
        return `
            <div class="${aspectConfig.class} w-full mb-3 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center group hover:border-gray-400 transition-colors">
                <div class="text-center text-gray-500 group-hover:text-gray-600 transition-colors">
                    <i class="fas fa-image text-3xl mb-2"></i>
                    <p class="text-sm font-medium">${message}</p>
                    <p class="text-xs mt-1">${this.escapeHtml(alt)}</p>
                </div>
            </div>
        `;
    }

    /**
     * Create error placeholder
     */
    createErrorPlaceholder(alt, aspectRatio, error = 'Error loading image') {
        const aspectConfig = this.config.aspectRatios[aspectRatio] || this.config.aspectRatios['16:9'];
        
        return `
            <div class="${aspectConfig.class} w-full mb-3 rounded-lg bg-red-50 border-2 border-dashed border-red-300 flex items-center justify-center">
                <div class="text-center text-red-500">
                    <i class="fas fa-exclamation-triangle text-3xl mb-2"></i>
                    <p class="text-sm font-medium">${error}</p>
                    <p class="text-xs mt-1">${this.escapeHtml(alt)}</p>
                </div>
            </div>
        `;
    }

    /**
     * Generate blur preview from file
     */
    generateBlurPreview(file) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                // Create small blurred version
                canvas.width = 50;
                canvas.height = 50;
                
                ctx.filter = 'blur(5px)';
                ctx.drawImage(img, 0, 0, 50, 50);
                
                resolve(canvas.toDataURL('image/jpeg', 0.3));
            };
            
            img.onerror = () => resolve(null);
            img.src = URL.createObjectURL(file);
        });
    }

    /**
     * Optimize image URL with Cloudinary transformations
     */
    optimizeImageUrl(url, type = 'preview') {
        if (!url || !url.includes('cloudinary.com')) {
            return url;
        }

        const transformation = this.config.cloudinaryTransformations[type];
        if (!transformation) {
            return url;
        }

        // Insert transformation into Cloudinary URL
        return url.replace('/upload/', `/upload/${transformation}/`);
    }

    /**
     * Validate image file
     */
    validateImageFile(file) {
        if (!file || !(file instanceof File)) {
            return false;
        }

        // Check file type
        if (!this.config.supportedFormats.includes(file.type)) {
            console.warn('❌ Unsupported file type:', file.type);
            return false;
        }

        // Check file size
        if (file.size > this.config.maxImageSize) {
            console.warn('❌ File too large:', this.formatFileSize(file.size));
            return false;
        }

        return true;
    }

    /**
     * Utility functions
     */
    isPendingUpload(source) {
        return typeof source === 'string' && source.startsWith('pending-upload-');
    }

    isFile(source) {
        return source instanceof File;
    }

    isUrl(source) {
        return typeof source === 'string' && (source.startsWith('http') || source.startsWith('data:'));
    }

    generatePreviewId(section, source) {
        const sourceHash = typeof source === 'string' ? source : source.name || 'unknown';
        return `preview-${section}-${sourceHash.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}`;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Get pending image data from editor
     */
    getPendingImageData(imageSource, section) {
        // This should be implemented by the case study editor
        if (window.caseStudyEditor && window.caseStudyEditor.pendingImages) {
            return window.caseStudyEditor.pendingImages[section];
        }
        return null;
    }

    /**
     * Setup intersection observer for lazy loading
     */
    setupIntersectionObserver() {
        if (!('IntersectionObserver' in window)) {
            return;
        }

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target.querySelector('img[data-src]');
                    if (img) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        this.observer.unobserve(entry.target);
                    }
                }
            });
        }, {
            rootMargin: '50px'
        });
    }

    /**
     * Setup cleanup handlers
     */
    setupCleanupHandlers() {
        // Cleanup object URLs when page unloads
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });

        // Cleanup periodically
        setInterval(() => {
            this.cleanupUnusedObjectUrls();
        }, 60000); // Every minute
    }

    /**
     * Cleanup all object URLs
     */
    cleanup() {
        this.objectUrls.forEach(url => {
            URL.revokeObjectURL(url);
        });
        this.objectUrls.clear();
        console.log('🧹 Cleaned up all object URLs');
    }

    /**
     * Cleanup unused object URLs
     */
    cleanupUnusedObjectUrls() {
        const unusedUrls = [];
        
        this.objectUrls.forEach(url => {
            const inUse = document.querySelector(`img[src="${url}"]`);
            if (!inUse) {
                unusedUrls.push(url);
            }
        });

        unusedUrls.forEach(url => {
            URL.revokeObjectURL(url);
            this.objectUrls.delete(url);
        });

        if (unusedUrls.length > 0) {
            console.log(`🧹 Cleaned up ${unusedUrls.length} unused object URLs`);
        }
    }

    /**
     * Zoom image functionality
     */
    zoomImage(previewId) {
        const container = document.getElementById(previewId);
        const img = container?.querySelector('img');
        
        if (!img) return;

        // Create zoom modal
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4';
        modal.innerHTML = `
            <div class="relative max-w-full max-h-full">
                <img src="${img.src}" alt="${img.alt}" class="max-w-full max-h-full object-contain">
                <button onclick="this.parentElement.parentElement.remove()" 
                        class="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-75 transition-all">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        document.body.appendChild(modal);

        // Close on click outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // Close on escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }

    /**
     * Download image functionality
     */
    downloadImage(url) {
        const link = document.createElement('a');
        link.href = url;
        link.download = 'image.jpg';
        link.click();
    }

    /**
     * Adjust container height for auto aspect ratio images
     */
    adjustContainerHeight(img) {
        try {
            const container = img.parentElement;
            if (!container) return;

            // Get natural dimensions
            const naturalWidth = img.naturalWidth;
            const naturalHeight = img.naturalHeight;
            
            if (naturalWidth && naturalHeight) {
                // Calculate aspect ratio
                const aspectRatio = naturalWidth / naturalHeight;
                const containerWidth = container.offsetWidth;
                const calculatedHeight = containerWidth / aspectRatio;
                
                // Set reasonable bounds
                const minHeight = 150;
                const maxHeight = 600;
                const finalHeight = Math.max(minHeight, Math.min(maxHeight, calculatedHeight));
                
                // Apply height to container
                container.style.height = `${finalHeight}px`;
                
                console.log(`📐 Auto aspect ratio: ${naturalWidth}x${naturalHeight} (${aspectRatio.toFixed(2)}) -> ${containerWidth}x${finalHeight}`);
            }
        } catch (error) {
            console.error('❌ Error adjusting container height:', error);
        }
    }
}

// Initialize global instance
window.advancedImagePreview = new AdvancedImagePreview();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdvancedImagePreview;
}
/**
 * Fast Image Preview System - Optimized for Speed
 * Lightweight implementation focused on performance
 */

class FastImagePreview {
    constructor() {
        this.objectUrls = new Set();
        this.loadingImages = new Map();
        
        // Simplified config for performance
        this.config = {
            maxImageSize: 10 * 1024 * 1024, // 10MB
            supportedFormats: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
            lazyLoadThreshold: '50px'
        };
        
        this.init();
    }

    init() {
        console.log('⚡ Initializing Fast Image Preview System...');
        this.setupCleanupHandlers();
        console.log('✅ Fast Image Preview System ready');
    }

    /**
     * Generate fast image preview with auto aspect ratio
     */
    generateImagePreview(imageSource, altText, section, options = {}) {
        const {
            aspectRatio = 'auto',
            className = '',
            maxWidth = null,
            showControls = false
        } = options;

        try {
            if (this.isPendingUpload(imageSource)) {
                return this.handlePendingUpload(imageSource, altText, section, options);
            } else if (this.isFile(imageSource)) {
                return this.handleFilePreview(imageSource, altText, options);
            } else if (this.isUrl(imageSource)) {
                return this.handleUrlPreview(imageSource, altText, options);
            } else {
                return this.createPlaceholder(altText, 'No image selected');
            }
        } catch (error) {
            console.error('❌ Error generating image preview:', error);
            return this.createErrorPlaceholder(altText, error.message);
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
        
        return this.createPlaceholder(altText, 'Image selected - will upload on save');
    }

    /**
     * Handle file preview - optimized for speed
     */
    handleFilePreview(file, altText, options) {
        // Quick validation
        if (!this.validateImageFile(file)) {
            return this.createErrorPlaceholder(altText, 'Invalid image file');
        }

        // Create object URL and track it
        const objectUrl = URL.createObjectURL(file);
        this.objectUrls.add(objectUrl);

        return this.createFastImageHTML(objectUrl, altText, options, {
            isPending: true,
            fileSize: this.formatFileSize(file.size),
            fileName: file.name
        });
    }

    /**
     * Handle URL preview - optimized for speed
     */
    handleUrlPreview(imageUrl, altText, options) {
        return this.createFastImageHTML(imageUrl, altText, options, {
            isPending: false,
            originalUrl: imageUrl
        });
    }

    /**
     * Create fast-loading image HTML with auto aspect ratio
     */
    createFastImageHTML(src, alt, options, metadata = {}) {
        const {
            aspectRatio = 'auto',
            maxWidth = null,
            className = '',
            showControls = false
        } = options;

        const previewId = `fast-img-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        
        // Determine container and image classes for auto aspect ratio
        let containerClass, imageClass;
        
        if (aspectRatio === 'auto') {
            // Auto aspect ratio - flexible container
            containerClass = [
                'relative',
                'w-full',
                'mb-3',
                'rounded-lg',
                'overflow-hidden',
                'bg-gray-100',
                'min-h-[100px]',
                'max-h-[600px]',
                maxWidth ? `max-w-[${maxWidth}]` : '',
                className
            ].filter(Boolean).join(' ');
            
            imageClass = [
                'w-full',
                'h-auto',
                'max-h-[600px]',
                'object-contain',
                'transition-opacity',
                'duration-300'
            ].join(' ');
        } else {
            // Fixed aspect ratio
            const aspectClasses = {
                '16:9': 'aspect-video',
                '4:3': 'aspect-[4/3]',
                '1:1': 'aspect-square',
                '3:2': 'aspect-[3/2]'
            };
            
            const aspectClass = aspectClasses[aspectRatio] || 'aspect-video';
            
            containerClass = [
                'relative',
                aspectClass,
                'w-full',
                'mb-3',
                'rounded-lg',
                'overflow-hidden',
                'bg-gray-100',
                maxWidth ? `max-w-[${maxWidth}]` : '',
                className
            ].filter(Boolean).join(' ');
            
            imageClass = [
                'absolute',
                'inset-0',
                'w-full',
                'h-full',
                'object-cover',
                'transition-opacity',
                'duration-300'
            ].join(' ');
        }

        // Status indicators
        const statusIndicator = metadata.isPending ? `
            <div class="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium z-10">
                <i class="fas fa-clock mr-1"></i>Pending
            </div>
        ` : '';

        // Simple loading placeholder
        const loadingPlaceholder = `
            <div class="absolute inset-0 flex items-center justify-center bg-gray-200 loading-placeholder">
                <div class="text-center text-gray-500">
                    <div class="animate-pulse w-8 h-8 bg-gray-400 rounded mx-auto mb-2"></div>
                    <p class="text-xs">Loading...</p>
                </div>
            </div>
        `;

        // Controls (optional)
        const controls = showControls ? `
            <div class="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                <button onclick="window.fastImagePreview.zoomImage('${previewId}')" 
                        class="bg-black bg-opacity-50 text-white p-1 rounded hover:bg-opacity-75">
                    <i class="fas fa-search-plus text-xs"></i>
                </button>
            </div>
        ` : '';

        return `
            <div id="${previewId}" class="${containerClass} group">
                ${loadingPlaceholder}
                <img 
                    src="${this.escapeHtml(src)}" 
                    alt="${this.escapeHtml(alt)}" 
                    class="${imageClass} opacity-0"
                    onload="
                        this.style.opacity='1'; 
                        this.parentElement.querySelector('.loading-placeholder')?.remove();
                        ${aspectRatio === 'auto' ? 'window.fastImagePreview.adjustContainerHeight(this);' : ''}
                    "
                    onerror="
                        this.parentElement.innerHTML='${this.createErrorPlaceholder(alt, 'Failed to load image').replace(/'/g, '\\\'').replace(/"/g, '\\"')}';
                    "
                    loading="eager"
                    decoding="async"
                >
                ${statusIndicator}
                ${controls}
            </div>
        `;
    }

    /**
     * Adjust container height for auto aspect ratio - optimized
     */
    adjustContainerHeight(img) {
        try {
            const container = img.parentElement;
            if (!container || !img.naturalWidth || !img.naturalHeight) return;

            const aspectRatio = img.naturalWidth / img.naturalHeight;
            const containerWidth = container.offsetWidth;
            const calculatedHeight = containerWidth / aspectRatio;
            
            // Apply reasonable bounds
            const finalHeight = Math.max(100, Math.min(600, calculatedHeight));
            container.style.height = `${finalHeight}px`;
            
        } catch (error) {
            console.error('❌ Error adjusting container height:', error);
        }
    }

    /**
     * Create simple placeholder
     */
    createPlaceholder(alt, message = 'No image') {
        return `
            <div class="w-full mb-3 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center min-h-[150px] max-h-[300px]">
                <div class="text-center text-gray-500 p-4">
                    <i class="fas fa-image text-2xl mb-2"></i>
                    <p class="text-sm font-medium">${message}</p>
                    <p class="text-xs mt-1">${this.escapeHtml(alt)}</p>
                </div>
            </div>
        `;
    }

    /**
     * Create error placeholder
     */
    createErrorPlaceholder(alt, error = 'Error loading image') {
        return `
            <div class="w-full mb-3 rounded-lg bg-red-50 border-2 border-dashed border-red-300 flex items-center justify-center min-h-[150px] max-h-[300px]">
                <div class="text-center text-red-500 p-4">
                    <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                    <p class="text-sm font-medium">${error}</p>
                    <p class="text-xs mt-1">${this.escapeHtml(alt)}</p>
                </div>
            </div>
        `;
    }

    /**
     * Simple zoom functionality
     */
    zoomImage(previewId) {
        const container = document.getElementById(previewId);
        const img = container?.querySelector('img');
        
        if (!img) return;

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4';
        modal.innerHTML = `
            <div class="relative max-w-full max-h-full">
                <img src="${img.src}" alt="${img.alt}" class="max-w-full max-h-full object-contain">
                <button onclick="this.parentElement.parentElement.remove()" 
                        class="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-75">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
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

    validateImageFile(file) {
        if (!file || !(file instanceof File)) return false;
        if (!this.config.supportedFormats.includes(file.type)) return false;
        if (file.size > this.config.maxImageSize) return false;
        return true;
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

    getPendingImageData(imageSource, section) {
        if (window.caseStudyEditor && window.caseStudyEditor.pendingImages) {
            return window.caseStudyEditor.pendingImages[section];
        }
        return null;
    }

    /**
     * Setup cleanup handlers
     */
    setupCleanupHandlers() {
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });

        // Cleanup periodically
        setInterval(() => {
            this.cleanupUnusedObjectUrls();
        }, 30000); // Every 30 seconds
    }

    /**
     * Cleanup all object URLs
     */
    cleanup() {
        this.objectUrls.forEach(url => {
            URL.revokeObjectURL(url);
        });
        this.objectUrls.clear();
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
}

// Initialize global instance
window.fastImagePreview = new FastImagePreview();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FastImagePreview;
}
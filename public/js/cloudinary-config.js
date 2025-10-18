/**
 * Cloudinary Configuration and Upload Handler
 * Handles image uploads, transformations, and management
 */

class CloudinaryManager {
    constructor() {
        // Cloudinary configuration from your API credentials
        this.cloudName = this.detectCloudName(); // Will be auto-detected or set manually
        this.apiKey = '951533987774134'; // Your actual API key
        this.apiSecret = 'jTPgMHSl-6m7LptvsBA5eDbOWwc'; // Your API secret (for server-side operations)
        this.uploadPreset = 'portfolio_unsigned'; // Unsigned upload preset

        // Upload widget configuration
        this.uploadWidget = null;
        this.currentCallback = null;

        this.init();
    }

    init() {
        console.log('🌤️ Initializing Cloudinary Manager...');

        // Validate configuration
        if (!this.cloudName || this.cloudName === 'your-cloud-name') {
            console.warn('⚠️ Cloudinary cloud name not configured. Using fallback upload.');
            this.useFallbackOnly = true;
            return;
        }

        // Wait for Cloudinary to load
        if (typeof cloudinary !== 'undefined') {
            this.setupUploadWidget();
        } else {
            // Retry after a short delay
            setTimeout(() => this.init(), 500);
        }
    }

    detectCloudName() {
        // Try to detect from environment or configuration
        // You need to get this from your Cloudinary dashboard
        // Go to https://cloudinary.com/console and copy your Cloud Name
        const cloudName = 'dgymjtqil'; // Your actual cloud name

        console.log('✅ Using Cloudinary cloud:', cloudName);
        return cloudName;
    }

    setupUploadWidget() {
        try {
            // Create unsigned upload preset configuration
            this.uploadWidget = cloudinary.createUploadWidget({
                cloudName: this.cloudName,
                uploadPreset: this.uploadPreset,
                apiKey: this.apiKey,
                sources: ['local', 'url', 'camera'],
                multiple: false,
                maxFiles: 1,
                maxFileSize: 10000000, // 10MB
                maxImageWidth: 2000,
                maxImageHeight: 2000,
                cropping: true,
                croppingAspectRatio: 16 / 9,
                croppingDefaultSelectionRatio: 0.8,
                croppingShowBackButton: true,
                croppingCoordinatesMode: 'custom',
                folder: 'portfolio/case-studies',
                publicId: null, // Will be set dynamically
                tags: ['portfolio', 'case-study'],
                context: {
                    caption: '',
                    alt: ''
                },
                clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
                transformation: [
                    { quality: 'auto', fetch_format: 'auto' }
                ],
                styles: {
                    palette: {
                        window: "#FFFFFF",
                        windowBorder: "#90A0B3",
                        tabIcon: "#0078FF",
                        menuIcons: "#5A616A",
                        textDark: "#000000",
                        textLight: "#FFFFFF",
                        link: "#0078FF",
                        action: "#FF620C",
                        inactiveTabIcon: "#0E2F5A",
                        error: "#F44235",
                        inProgress: "#0078FF",
                        complete: "#20B832",
                        sourceBg: "#E4EBF1"
                    },
                    fonts: {
                        default: null,
                        "'Nunito', sans-serif": {
                            url: "https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap",
                            active: true
                        }
                    }
                }
            }, (error, result) => {
                if (!error && result && result.event === "success") {
                    console.log('✅ Upload successful:', result.info);
                    if (this.currentCallback) {
                        this.currentCallback(result.info);
                    }
                } else if (error) {
                    console.error('❌ Upload error:', error);
                    this.showNotification('error', 'Upload Failed', error.message || 'Failed to upload image');
                }
            });

            console.log('✅ Cloudinary upload widget configured');
        } catch (error) {
            console.error('❌ Failed to setup Cloudinary widget:', error);
            this.showFallbackUpload();
        }
    }

    // Open upload widget
    openUploadWidget(callback, options = {}) {
        if (!this.uploadWidget) {
            console.error('❌ Upload widget not initialized');
            this.showFallbackUpload();
            return;
        }

        this.currentCallback = callback;

        // Update widget options if provided
        if (options.folder) {
            this.uploadWidget.update({ folder: options.folder });
        }
        if (options.publicId) {
            this.uploadWidget.update({ publicId: options.publicId });
        }
        if (options.tags) {
            this.uploadWidget.update({ tags: options.tags });
        }

        this.uploadWidget.open();
    }

    // Generate optimized image URL
    getOptimizedUrl(publicId, options = {}) {
        const baseUrl = `https://res.cloudinary.com/${this.cloudName}/image/upload/`;

        const transformations = [];

        // Quality optimization
        transformations.push('f_auto', 'q_auto');

        // Responsive sizing
        if (options.width) transformations.push(`w_${options.width}`);
        if (options.height) transformations.push(`h_${options.height}`);
        if (options.crop) transformations.push(`c_${options.crop}`);

        // Effects
        if (options.blur) transformations.push(`e_blur:${options.blur}`);
        if (options.brightness) transformations.push(`e_brightness:${options.brightness}`);
        if (options.contrast) transformations.push(`e_contrast:${options.contrast}`);

        const transformString = transformations.length > 0 ? transformations.join(',') + '/' : '';

        return `${baseUrl}${transformString}${publicId}`;
    }

    // Generate responsive image URLs
    getResponsiveUrls(publicId) {
        return {
            thumbnail: this.getOptimizedUrl(publicId, { width: 150, height: 150, crop: 'fill' }),
            small: this.getOptimizedUrl(publicId, { width: 400, crop: 'scale' }),
            medium: this.getOptimizedUrl(publicId, { width: 800, crop: 'scale' }),
            large: this.getOptimizedUrl(publicId, { width: 1200, crop: 'scale' }),
            original: this.getOptimizedUrl(publicId)
        };
    }

    // Delete image from Cloudinary
    async deleteImage(publicId) {
        try {
            // Note: Deletion requires server-side implementation due to API secret requirement
            const response = await fetch('/api/cloudinary/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('portfolio_auth_token')}`
                },
                body: JSON.stringify({ publicId })
            });

            if (!response.ok) {
                throw new Error('Failed to delete image');
            }

            const result = await response.json();
            console.log('✅ Image deleted:', publicId);
            return result;

        } catch (error) {
            console.error('❌ Failed to delete image:', error);
            throw error;
        }
    }

    // Fallback upload for when Cloudinary widget fails
    showFallbackUpload() {
        console.log('📁 Showing fallback file upload...');

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';

        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleFallbackUpload(file);
            }
        };

        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    }

    async handleFallbackUpload(file) {
        try {
            console.log('📤 Uploading file via fallback method...');

            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', this.uploadPreset);
            formData.append('folder', 'portfolio/case-studies');

            const response = await fetch(`https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const result = await response.json();
            console.log('✅ Fallback upload successful:', result);

            if (this.currentCallback) {
                this.currentCallback(result);
            }

        } catch (error) {
            console.error('❌ Fallback upload failed:', error);
            this.showNotification('error', 'Upload Failed', 'Failed to upload image. Please try again.');
        }
    }

    // Show notification (assumes notification system exists)
    showNotification(type, title, message) {
        if (window.showNotification) {
            window.showNotification(type, title, message);
        } else {
            console.log(`${type.toUpperCase()}: ${title} - ${message}`);
        }
    }

    // Validate image file
    validateImage(file) {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        const maxSize = 10 * 1024 * 1024; // 10MB

        if (!validTypes.includes(file.type)) {
            throw new Error('Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.');
        }

        if (file.size > maxSize) {
            throw new Error('File too large. Please upload an image smaller than 10MB.');
        }

        return true;
    }

    // Get image metadata
    async getImageMetadata(publicId) {
        try {
            const response = await fetch(`https://res.cloudinary.com/${this.cloudName}/image/upload/${publicId}.json`);

            if (!response.ok) {
                throw new Error('Failed to get image metadata');
            }

            return await response.json();

        } catch (error) {
            console.error('❌ Failed to get image metadata:', error);
            return null;
        }
    }

    // Transform existing image
    transformImage(publicId, transformations) {
        return this.getOptimizedUrl(publicId, transformations);
    }

    // Batch upload multiple images
    async batchUpload(files, options = {}) {
        const results = [];
        const errors = [];

        for (let i = 0; i < files.length; i++) {
            try {
                const result = await this.uploadSingleFile(files[i], {
                    ...options,
                    publicId: options.publicId ? `${options.publicId}_${i + 1}` : null
                });
                results.push(result);
            } catch (error) {
                errors.push({ file: files[i].name, error: error.message });
            }
        }

        return { results, errors };
    }

    // Upload single file (promise-based)
    uploadSingleFile(file, options = {}) {
        return new Promise((resolve, reject) => {
            this.validateImage(file);

            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', this.uploadPreset);

            if (options.folder) formData.append('folder', options.folder);
            if (options.publicId) formData.append('public_id', options.publicId);
            if (options.tags) formData.append('tags', options.tags.join(','));

            fetch(`https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`, {
                method: 'POST',
                body: formData
            })
                .then(response => {
                    if (!response.ok) throw new Error('Upload failed');
                    return response.json();
                })
                .then(result => {
                    console.log('✅ Single file upload successful:', result);
                    resolve(result);
                })
                .catch(error => {
                    console.error('❌ Single file upload failed:', error);
                    reject(error);
                });
        });
    }
}

// Create global instance
window.cloudinaryManager = new CloudinaryManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CloudinaryManager;
}

// Helper functions for easy access
window.uploadImage = (callback, options) => {
    window.cloudinaryManager.openUploadWidget(callback, options);
};

window.getImageUrl = (publicId, options) => {
    return window.cloudinaryManager.getOptimizedUrl(publicId, options);
};

window.getResponsiveImages = (publicId) => {
    return window.cloudinaryManager.getResponsiveUrls(publicId);
};
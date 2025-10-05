/**
 * Comprehensive Cloudinary Service
 * Handles all image operations for admin and frontend case studies
 * Uses your actual Cloudinary API credentials
 */

class CloudinaryService {
    constructor() {
        // Your actual Cloudinary credentials
        this.apiKey = '951533987774134';
        this.apiSecret = 'jTPgMHSl-6m7LptvsBA5eDbOWwc';
        this.cloudName = this.getCloudName();
        
        // Upload presets for different use cases
        this.uploadPresets = {
            caseStudy: 'case_study_preset',
            hero: 'hero_image_preset',
            gallery: 'gallery_preset',
            profile: 'profile_preset',
            general: 'ml_default' // Fallback to default
        };
        
        // Image transformation presets
        this.transformations = {
            hero: { width: 1200, height: 600, crop: 'fill', quality: 'auto', format: 'auto' },
            thumbnail: { width: 300, height: 200, crop: 'fill', quality: 'auto', format: 'auto' },
            gallery: { width: 800, height: 600, crop: 'fit', quality: 'auto', format: 'auto' },
            profile: { width: 150, height: 150, crop: 'fill', quality: 'auto', format: 'auto', gravity: 'face' },
            preview: { width: 400, height: 300, crop: 'fit', quality: 'auto', format: 'auto' }
        };
        
        this.init();
    }

    getCloudName() {
        // You need to get this from your Cloudinary dashboard
        // Go to https://cloudinary.com/console and copy your Cloud Name
        const cloudName = 'dgymjtqil'; // Your actual cloud name
        
        console.log('✅ Using Cloudinary cloud:', cloudName);
        return cloudName;
    }

    async init() {
        console.log('🌤️ Initializing Cloudinary Service...');
        
        // Wait for Cloudinary SDK to load
        await this.waitForCloudinarySDK();
        
        // Setup upload widgets for different contexts
        this.setupUploadWidgets();
        
        console.log('✅ Cloudinary Service initialized');
    }

    async waitForCloudinarySDK() {
        return new Promise((resolve) => {
            const checkSDK = () => {
                if (typeof cloudinary !== 'undefined') {
                    resolve();
                } else {
                    setTimeout(checkSDK, 100);
                }
            };
            checkSDK();
        });
    }

    setupUploadWidgets() {
        this.widgets = {};
        
        // Case Study Hero Image Widget
        this.widgets.hero = this.createUploadWidget({
            folder: 'portfolio/case-studies/hero',
            tags: ['case-study', 'hero'],
            transformation: [this.transformations.hero],
            cropping: true,
            croppingAspectRatio: 2,
            sources: ['local', 'url']
        });

        // Case Study Gallery Widget
        this.widgets.gallery = this.createUploadWidget({
            folder: 'portfolio/case-studies/gallery',
            tags: ['case-study', 'gallery'],
            transformation: [this.transformations.gallery],
            multiple: true,
            maxFiles: 10,
            sources: ['local', 'url']
        });

        // General Case Study Images
        this.widgets.general = this.createUploadWidget({
            folder: 'portfolio/case-studies/general',
            tags: ['case-study', 'general'],
            sources: ['local', 'url', 'camera']
        });

        // Profile Images
        this.widgets.profile = this.createUploadWidget({
            folder: 'portfolio/profiles',
            tags: ['profile'],
            transformation: [this.transformations.profile],
            cropping: true,
            croppingAspectRatio: 1,
            sources: ['local', 'camera']
        });
    }

    createUploadWidget(options = {}) {
        const defaultOptions = {
            cloudName: this.cloudName,
            uploadPreset: this.uploadPresets.general,
            apiKey: this.apiKey,
            sources: ['local', 'url'],
            multiple: false,
            maxFiles: 1,
            maxFileSize: 10000000, // 10MB
            clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
            styles: {
                palette: {
                    window: "#FFFFFF",
                    windowBorder: "#90A0B3",
                    tabIcon: "#6bb2e2",
                    menuIcons: "#5A616A",
                    textDark: "#000000",
                    textLight: "#FFFFFF",
                    link: "#6bb2e2",
                    action: "#FF620C",
                    inactiveTabIcon: "#0E2F5A",
                    error: "#F44235",
                    inProgress: "#6bb2e2",
                    complete: "#20B832",
                    sourceBg: "#E4EBF1"
                }
            }
        };

        const mergedOptions = { ...defaultOptions, ...options };

        return cloudinary.createUploadWidget(mergedOptions, (error, result) => {
            if (!error && result && result.event === "success") {
                console.log('✅ Upload successful:', result.info);
                this.handleUploadSuccess(result.info);
            } else if (error) {
                console.error('❌ Upload error:', error);
                this.handleUploadError(error);
            }
        });
    }

    // Upload Methods for Different Contexts
    async uploadHeroImage(callback, options = {}) {
        return this.openUploadWidget('hero', callback, {
            folder: 'portfolio/case-studies/hero',
            tags: ['case-study', 'hero'],
            publicId: options.publicId || `hero_${Date.now()}`,
            ...options
        });
    }

    async uploadGalleryImages(callback, options = {}) {
        return this.openUploadWidget('gallery', callback, {
            folder: 'portfolio/case-studies/gallery',
            tags: ['case-study', 'gallery'],
            multiple: true,
            maxFiles: 10,
            ...options
        });
    }

    async uploadGeneralImage(callback, options = {}) {
        return this.openUploadWidget('general', callback, {
            folder: 'portfolio/case-studies/general',
            tags: ['case-study', 'general'],
            ...options
        });
    }

    async uploadProfileImage(callback, options = {}) {
        return this.openUploadWidget('profile', callback, {
            folder: 'portfolio/profiles',
            tags: ['profile'],
            transformation: [this.transformations.profile],
            ...options
        });
    }

    openUploadWidget(widgetType, callback, options = {}) {
        const widget = this.widgets[widgetType] || this.widgets.general;
        
        // Update widget options if provided
        if (options.folder) widget.update({ folder: options.folder });
        if (options.publicId) widget.update({ publicId: options.publicId });
        if (options.tags) widget.update({ tags: options.tags });

        // Set callback
        this.currentCallback = callback;
        
        // Open widget
        widget.open();
        
        return widget;
    }

    // Image URL Generation with Transformations
    getImageUrl(publicId, transformation = 'preview') {
        if (!publicId) return null;
        
        const baseUrl = `https://res.cloudinary.com/${this.cloudName}/image/upload/`;
        
        let transformString = '';
        if (typeof transformation === 'string' && this.transformations[transformation]) {
            transformString = this.buildTransformationString(this.transformations[transformation]);
        } else if (typeof transformation === 'object') {
            transformString = this.buildTransformationString(transformation);
        }
        
        return `${baseUrl}${transformString}${publicId}`;
    }

    buildTransformationString(transformation) {
        const parts = [];
        
        if (transformation.width) parts.push(`w_${transformation.width}`);
        if (transformation.height) parts.push(`h_${transformation.height}`);
        if (transformation.crop) parts.push(`c_${transformation.crop}`);
        if (transformation.quality) parts.push(`q_${transformation.quality}`);
        if (transformation.format) parts.push(`f_${transformation.format}`);
        if (transformation.gravity) parts.push(`g_${transformation.gravity}`);
        
        return parts.length > 0 ? parts.join(',') + '/' : '';
    }

    // Get Multiple Image Sizes
    getResponsiveImageUrls(publicId) {
        return {
            thumbnail: this.getImageUrl(publicId, 'thumbnail'),
            preview: this.getImageUrl(publicId, 'preview'),
            hero: this.getImageUrl(publicId, 'hero'),
            gallery: this.getImageUrl(publicId, 'gallery'),
            original: this.getImageUrl(publicId, {})
        };
    }

    // Batch Upload for Multiple Images
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

    // Direct Upload (Fallback Method)
    async uploadSingleFile(file, options = {}) {
        return new Promise((resolve, reject) => {
            if (!this.validateFile(file)) {
                reject(new Error('Invalid file type or size'));
                return;
            }

            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', options.uploadPreset || this.uploadPresets.general);
            formData.append('api_key', this.apiKey);
            
            if (options.folder) formData.append('folder', options.folder);
            if (options.publicId) formData.append('public_id', options.publicId);
            if (options.tags) formData.append('tags', Array.isArray(options.tags) ? options.tags.join(',') : options.tags);

            fetch(`https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`, {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (!response.ok) throw new Error(`Upload failed: ${response.statusText}`);
                return response.json();
            })
            .then(result => {
                console.log('✅ Direct upload successful:', result);
                resolve(result);
            })
            .catch(error => {
                console.error('❌ Direct upload failed:', error);
                reject(error);
            });
        });
    }

    // File Validation
    validateFile(file) {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        const maxSize = 10 * 1024 * 1024; // 10MB

        if (!validTypes.includes(file.type)) {
            this.showNotification('error', 'Invalid File Type', 'Please upload a JPEG, PNG, GIF, or WebP image.');
            return false;
        }

        if (file.size > maxSize) {
            this.showNotification('error', 'File Too Large', 'Please upload an image smaller than 10MB.');
            return false;
        }

        return true;
    }

    // Image Deletion (Server-side required)
    async deleteImage(publicId) {
        try {
            // This requires server-side implementation due to API secret
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

    // Event Handlers
    handleUploadSuccess(info) {
        if (this.currentCallback) {
            this.currentCallback(info);
        }
        
        this.showNotification('success', 'Upload Successful', 'Image uploaded and optimized successfully!');
    }

    handleUploadError(error) {
        console.error('Upload error:', error);
        this.showNotification('error', 'Upload Failed', error.message || 'Failed to upload image. Please try again.');
    }

    // Utility Methods
    showNotification(type, title, message) {
        if (window.showNotification) {
            window.showNotification(type, title, message);
        } else if (window.editor && window.editor.showNotification) {
            window.editor.showNotification(type, title, message);
        } else {
            console.log(`${type.toUpperCase()}: ${title} - ${message}`);
        }
    }

    // Get Image Metadata
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

    // Transform Existing Image
    transformImage(publicId, transformation) {
        return this.getImageUrl(publicId, transformation);
    }

    // Generate Signed URL (for secure uploads)
    generateSignedUrl(options = {}) {
        // This would typically be done server-side
        // For now, we'll use the unsigned upload preset
        return {
            url: `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
            params: {
                upload_preset: options.uploadPreset || this.uploadPresets.general,
                folder: options.folder || 'portfolio',
                tags: options.tags || 'general'
            }
        };
    }
}

// Create global instance
window.cloudinaryService = new CloudinaryService();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CloudinaryService;
}

// Helper functions for easy access
window.uploadHeroImage = (callback, options) => {
    return window.cloudinaryService.uploadHeroImage(callback, options);
};

window.uploadGalleryImages = (callback, options) => {
    return window.cloudinaryService.uploadGalleryImages(callback, options);
};

window.uploadGeneralImage = (callback, options) => {
    return window.cloudinaryService.uploadGeneralImage(callback, options);
};

window.getImageUrl = (publicId, transformation) => {
    return window.cloudinaryService.getImageUrl(publicId, transformation);
};

window.getResponsiveImages = (publicId) => {
    return window.cloudinaryService.getResponsiveImageUrls(publicId);
};
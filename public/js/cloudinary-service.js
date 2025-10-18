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

    // Enhanced Upload with ImageFlowStabilizer integration and retry logic
    async uploadSingleFile(file, options = {}) {
        const maxRetries = options.maxRetries || 3;
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔄 Upload attempt ${attempt}/${maxRetries} for file:`, file.name);
                
                // Use ImageFlowStabilizer if available for enhanced upload
                if (window.imageFlowStabilizer) {
                    console.log('🔄 Using ImageFlowStabilizer for enhanced upload');
                    
                    const result = await window.imageFlowStabilizer.uploadWithValidation(file, {
                        folder: options.folder || 'case-studies',
                        context: options.context || 'case_study',
                        referenceId: options.referenceId,
                        transformation: options.transformation,
                        originalFilename: file.name
                    });
                    
                    if (result.success) {
                        // Enhanced secure_url validation
                        if (!this.validateSecureUrl(result.data.url)) {
                            throw new Error('Invalid secure_url returned from upload');
                        }
                        
                        // Additional validation for image accessibility
                        await this.validateImageAccessibility(result.data.url);
                        
                        console.log('✅ Enhanced upload successful:', result.data.id);
                        return {
                            ...result.data,
                            enhanced: true,
                            attempt: attempt,
                            validated: true
                        };
                    } else {
                        throw new Error(result.error || 'Upload failed');
                    }
                }
                
                // Fallback to direct upload with enhanced validation
                console.log('⚠️ Using fallback direct upload');
                const result = await this.directUploadWithValidation(file, options);
                
                console.log('✅ Direct upload successful on attempt:', attempt);
                return {
                    ...result,
                    enhanced: false,
                    attempt: attempt,
                    validated: true
                };
                
            } catch (error) {
                lastError = error;
                
                // Enhance error with Cloudinary-specific information
                error.code = this.mapCloudinaryErrorCode(error);
                error.service = 'cloudinary';
                
                console.error(`❌ Upload attempt ${attempt} failed:`, error.message);
                
                // Use API Error Handler if available
                if (typeof window !== 'undefined' && window.apiErrorHandler) {
                    const errorResponse = await window.apiErrorHandler.handleError(error, {
                        operation: 'cloudinaryUpload',
                        resource: file.name,
                        attempt: attempt,
                        maxAttempts: maxRetries,
                        service: 'cloudinary'
                    });
                    
                    // Don't retry if error handler says not to
                    if (!errorResponse.canRetry || attempt === maxRetries) {
                        throw errorResponse;
                    }
                } else {
                    // Fallback error handling
                    if (this.isNonRetryableError(error) || attempt === maxRetries) {
                        break;
                    }
                }
                
                // Wait before retry with exponential backoff
                const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
                console.log(`⏳ Waiting ${delay}ms before retry...`);
                await this.delay(delay);
            }
        }
        
        // Final error handling
        if (typeof window !== 'undefined' && window.apiErrorHandler) {
            const finalError = await window.apiErrorHandler.handleError(lastError, {
                operation: 'cloudinaryUpload',
                resource: file.name,
                finalAttempt: true,
                service: 'cloudinary'
            });
            throw finalError;
        } else {
            console.error('❌ All upload attempts failed:', lastError);
            throw lastError;
        }
    }

    /**
     * Map Cloudinary error codes to standardized error codes
     */
    mapCloudinaryErrorCode(error) {
        const message = error.message?.toLowerCase() || '';
        const code = error.code || error.error?.code || '';
        
        // File validation errors
        if (message.includes('invalid file type') || message.includes('unsupported format')) {
            return 'INVALID_FORMAT';
        }
        if (message.includes('file too large') || message.includes('file size')) {
            return 'VALIDATION_ERROR';
        }
        if (message.includes('invalid secure_url') || message.includes('url validation')) {
            return 'VALIDATION_ERROR';
        }
        
        // Authentication errors
        if (message.includes('unauthorized') || message.includes('invalid api key')) {
            return 'UNAUTHORIZED';
        }
        if (message.includes('forbidden') || message.includes('access denied')) {
            return 'FORBIDDEN';
        }
        
        // Rate limiting
        if (message.includes('rate limit') || message.includes('too many requests')) {
            return 'QUOTA_EXCEEDED';
        }
        
        // Network errors
        if (message.includes('network') || message.includes('connection')) {
            return 'NETWORK_ERROR';
        }
        if (message.includes('timeout')) {
            return 'TIMEOUT_ERROR';
        }
        
        // Server errors
        if (message.includes('server error') || message.includes('internal error')) {
            return 'INTERNAL_ERROR';
        }
        if (message.includes('service unavailable') || message.includes('maintenance')) {
            return 'SERVICE_UNAVAILABLE';
        }
        
        // Cloudinary-specific errors
        if (code === 'ENOTFOUND' || message.includes('not found')) {
            return 'SERVICE_UNAVAILABLE';
        }
        
        return 'UNKNOWN_ERROR';
    }

    // Check if error should not be retried
    isNonRetryableError(error) {
        const errorCode = this.mapCloudinaryErrorCode(error);
        const nonRetryableErrors = [
            'INVALID_FORMAT',
            'VALIDATION_ERROR',
            'UNAUTHORIZED',
            'FORBIDDEN'
        ];
        
        return nonRetryableErrors.includes(errorCode);
    }

    // Validate image accessibility
    async validateImageAccessibility(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const timeout = setTimeout(() => {
                reject(new Error('Image accessibility validation timeout'));
            }, 10000);
            
            img.onload = () => {
                clearTimeout(timeout);
                console.log('✅ Image accessibility validated:', url);
                resolve(true);
            };
            
            img.onerror = () => {
                clearTimeout(timeout);
                reject(new Error('Image not accessible after upload'));
            };
            
            img.src = url;
        });
    }

    // Direct Upload (Fallback Method) with enhanced error handling and validation
    async directUploadWithValidation(file, options = {}) {
        return new Promise((resolve, reject) => {
            // Enhanced file validation
            const validationResult = this.validateFileEnhanced(file);
            if (!validationResult.isValid) {
                reject(new Error(`File validation failed: ${validationResult.errors.join(', ')}`));
                return;
            }

            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', options.uploadPreset || this.uploadPresets.general);
            formData.append('api_key', this.apiKey);
            
            // Enhanced folder structure
            const folder = options.folder || 'portfolio/case-studies/general';
            formData.append('folder', folder);
            
            if (options.publicId) formData.append('public_id', options.publicId);
            
            // Enhanced tagging
            const tags = options.tags || ['case-study', 'general'];
            const tagString = Array.isArray(tags) ? tags.join(',') : tags;
            formData.append('tags', tagString);
            
            // Add transformation if provided
            if (options.transformation) {
                formData.append('transformation', JSON.stringify(options.transformation));
            }

            // Add upload timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
                reject(new Error('Upload timeout after 60 seconds'));
            }, 60000);

            fetch(`https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`, {
                method: 'POST',
                body: formData,
                signal: controller.signal
            })
            .then(response => {
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    return response.json().then(errorData => {
                        throw new Error(errorData.error?.message || `Upload failed: ${response.statusText}`);
                    });
                }
                return response.json();
            })
            .then(result => {
                // Enhanced validation of Cloudinary response
                const validationResult = this.validateCloudinaryResponse(result);
                if (!validationResult.isValid) {
                    throw new Error(`Invalid Cloudinary response: ${validationResult.errors.join(', ')}`);
                }
                
                console.log('✅ Direct upload successful:', result.public_id);
                
                // Return standardized format with enhanced metadata
                resolve({
                    id: result.public_id,
                    url: result.secure_url,
                    publicId: result.public_id,
                    width: result.width,
                    height: result.height,
                    size: result.bytes,
                    format: result.format,
                    folder: folder,
                    tags: tagString.split(','),
                    createdAt: result.created_at,
                    version: result.version,
                    etag: result.etag
                });
            })
            .catch(error => {
                clearTimeout(timeoutId);
                console.error('❌ Direct upload failed:', error);
                
                // Enhanced error information
                const enhancedError = new Error(error.message);
                enhancedError.originalError = error;
                enhancedError.fileName = file.name;
                enhancedError.fileSize = file.size;
                enhancedError.uploadMethod = 'direct';
                
                reject(enhancedError);
            });
        });
    }

    // Enhanced file validation
    validateFileEnhanced(file) {
        const errors = [];
        
        if (!file) {
            errors.push('No file provided');
            return { isValid: false, errors };
        }

        // File type validation
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            errors.push(`Invalid file type: ${file.type}. Allowed types: ${validTypes.join(', ')}`);
        }

        // File size validation
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            errors.push(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum size: 10MB`);
        }

        // File name validation
        if (!file.name || file.name.trim() === '') {
            errors.push('File must have a valid name');
        }

        // Check for potentially problematic characters in filename
        const problematicChars = /[<>:"/\\|?*]/;
        if (problematicChars.test(file.name)) {
            errors.push('File name contains invalid characters');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Validate Cloudinary response
    validateCloudinaryResponse(result) {
        const errors = [];
        
        if (!result) {
            errors.push('Empty response from Cloudinary');
            return { isValid: false, errors };
        }

        // Check required fields
        if (!result.secure_url) {
            errors.push('No secure_url in response');
        }

        if (!result.public_id) {
            errors.push('No public_id in response');
        }

        // Validate secure_url format
        if (result.secure_url && !this.validateSecureUrl(result.secure_url)) {
            errors.push('Invalid secure_url format');
        }

        // Check for reasonable dimensions
        if (result.width && result.width < 1) {
            errors.push('Invalid image width');
        }

        if (result.height && result.height < 1) {
            errors.push('Invalid image height');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Validate secure_url format
    validateSecureUrl(url) {
        if (!url || typeof url !== 'string') {
            return false;
        }

        // Check if it's a valid Cloudinary URL
        const cloudinaryPattern = /^https:\/\/res\.cloudinary\.com\/[^\/]+\/image\/upload\//;
        return cloudinaryPattern.test(url);
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

    // Enhanced Event Handlers with progress tracking
    handleUploadSuccess(info) {
        // Validate secure_url before processing
        if (!this.validateSecureUrl(info.secure_url)) {
            console.error('❌ Invalid secure_url in upload result:', info.secure_url);
            this.handleUploadError(new Error('Invalid secure_url returned'));
            return;
        }
        
        if (this.currentCallback) {
            this.currentCallback({
                success: true,
                data: {
                    id: info.public_id,
                    url: info.secure_url,
                    publicId: info.public_id,
                    width: info.width,
                    height: info.height,
                    size: info.bytes,
                    format: info.format
                }
            });
        }
        
        this.showNotification('success', 'Upload Successful', 'Image uploaded and optimized successfully!');
    }

    handleUploadError(error) {
        console.error('Upload error:', error);
        
        if (this.currentCallback) {
            this.currentCallback({
                success: false,
                error: error.message || 'Upload failed',
                retry: () => {
                    // Provide retry functionality
                    console.log('🔄 Retrying upload...');
                }
            });
        }
        
        this.showNotification('error', 'Upload Failed', error.message || 'Failed to upload image. Please try again.');
    }

    // Upload with progress tracking and error recovery
    async uploadWithProgress(file, options = {}, progressCallback = null) {
        const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        try {
            if (progressCallback) {
                progressCallback({ 
                    uploadId,
                    stage: 'validating', 
                    progress: 0,
                    message: 'Validating file...'
                });
            }
            
            // Enhanced file validation
            const validationResult = this.validateFileEnhanced(file);
            if (!validationResult.isValid) {
                throw new Error(`File validation failed: ${validationResult.errors.join(', ')}`);
            }
            
            if (progressCallback) {
                progressCallback({ 
                    uploadId,
                    stage: 'uploading', 
                    progress: 10,
                    message: 'Starting upload...'
                });
            }
            
            // Use enhanced upload with progress updates
            const result = await this.uploadSingleFileWithProgress(file, options, (progress) => {
                if (progressCallback) {
                    progressCallback({
                        uploadId,
                        stage: 'uploading',
                        progress: 10 + (progress * 0.6), // 10-70%
                        message: `Uploading... ${Math.round(progress)}%`
                    });
                }
            });
            
            if (progressCallback) {
                progressCallback({ 
                    uploadId,
                    stage: 'processing', 
                    progress: 80,
                    message: 'Processing image...'
                });
            }
            
            // Validate upload result
            await this.validateUploadResult(result);
            
            if (progressCallback) {
                progressCallback({ 
                    uploadId,
                    stage: 'storing', 
                    progress: 90,
                    message: 'Storing metadata...'
                });
            }
            
            // Store additional metadata if needed
            if (options.storeMetadata !== false) {
                await this.storeUploadMetadata(result, options);
            }
            
            if (progressCallback) {
                progressCallback({ 
                    uploadId,
                    stage: 'complete', 
                    progress: 100,
                    message: 'Upload completed successfully!'
                });
            }
            
            return {
                ...result,
                uploadId,
                completedAt: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ Upload with progress failed:', error);
            
            if (progressCallback) {
                progressCallback({ 
                    uploadId,
                    stage: 'error', 
                    progress: 0, 
                    error: error.message,
                    message: `Upload failed: ${error.message}`,
                    retry: () => this.uploadWithProgress(file, options, progressCallback)
                });
            }
            
            throw error;
        }
    }

    // Upload single file with progress tracking
    async uploadSingleFileWithProgress(file, options = {}, progressCallback = null) {
        // For now, we'll simulate progress since direct upload doesn't provide real progress
        // In a real implementation, you might use XMLHttpRequest for progress tracking
        
        const simulateProgress = async () => {
            const steps = [0, 20, 40, 60, 80, 100];
            for (const step of steps) {
                if (progressCallback) {
                    progressCallback(step);
                }
                await this.delay(200);
            }
        };

        // Start progress simulation
        const progressPromise = simulateProgress();
        
        // Start actual upload
        const uploadPromise = this.uploadSingleFile(file, options);
        
        // Wait for upload to complete (progress will continue in background)
        const result = await uploadPromise;
        
        // Ensure progress reaches 100%
        if (progressCallback) {
            progressCallback(100);
        }
        
        return result;
    }

    // Validate upload result
    async validateUploadResult(result) {
        if (!result || !result.url) {
            throw new Error('Invalid upload result: missing URL');
        }

        // Test image accessibility
        try {
            await this.validateImageAccessibility(result.url);
        } catch (error) {
            throw new Error(`Upload validation failed: ${error.message}`);
        }

        return true;
    }

    // Store upload metadata
    async storeUploadMetadata(result, options = {}) {
        try {
            // Store in local storage for tracking
            const uploadHistory = JSON.parse(localStorage.getItem('cloudinary_upload_history') || '[]');
            
            const metadata = {
                id: result.id,
                url: result.url,
                publicId: result.publicId,
                uploadedAt: new Date().toISOString(),
                context: options.context || 'general',
                referenceId: options.referenceId,
                folder: result.folder,
                size: result.size,
                format: result.format
            };
            
            uploadHistory.unshift(metadata);
            
            // Keep only last 100 uploads
            if (uploadHistory.length > 100) {
                uploadHistory.splice(100);
            }
            
            localStorage.setItem('cloudinary_upload_history', JSON.stringify(uploadHistory));
            
            console.log('✅ Upload metadata stored:', result.id);
            
        } catch (error) {
            console.warn('⚠️ Failed to store upload metadata:', error);
            // Don't fail the upload for metadata storage issues
        }
    }

    // Get upload history
    getUploadHistory(limit = 10) {
        try {
            const history = JSON.parse(localStorage.getItem('cloudinary_upload_history') || '[]');
            return history.slice(0, limit);
        } catch (error) {
            console.error('❌ Failed to get upload history:', error);
            return [];
        }
    }

    // Clear upload history
    clearUploadHistory() {
        try {
            localStorage.removeItem('cloudinary_upload_history');
            console.log('✅ Upload history cleared');
        } catch (error) {
            console.error('❌ Failed to clear upload history:', error);
        }
    }

    // Delay utility
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Handle Cloudinary API errors with comprehensive error processing
     */
    async handleCloudinaryError(error, context = {}) {
        try {
            // Enhance error with Cloudinary-specific information
            const enhancedError = {
                ...error,
                code: this.mapCloudinaryErrorCode(error),
                service: 'cloudinary',
                timestamp: new Date().toISOString(),
                context: context
            };

            // Use API Error Handler if available
            if (typeof window !== 'undefined' && window.apiErrorHandler) {
                return await window.apiErrorHandler.handleError(enhancedError, {
                    ...context,
                    service: 'cloudinary'
                });
            } else {
                // Fallback error handling
                console.error('🌤️ Cloudinary Error:', enhancedError);
                return {
                    success: false,
                    error: enhancedError.code,
                    message: this.getCloudinaryErrorMessage(enhancedError),
                    canRetry: !this.isNonRetryableError(enhancedError),
                    timestamp: enhancedError.timestamp,
                    context: context
                };
            }
        } catch (handlingError) {
            console.error('❌ Error in Cloudinary error handler:', handlingError);
            return {
                success: false,
                error: 'HANDLER_ERROR',
                message: 'An unexpected error occurred while processing the Cloudinary request',
                canRetry: false,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Get user-friendly error message for Cloudinary errors
     */
    getCloudinaryErrorMessage(error) {
        const errorMessages = {
            'INVALID_FORMAT': 'The file format is not supported. Please use JPG, PNG, or WebP images.',
            'VALIDATION_ERROR': 'The file did not pass validation. Please check the file size and format.',
            'UNAUTHORIZED': 'Authentication failed. Please check your Cloudinary configuration.',
            'FORBIDDEN': 'Access denied. You do not have permission to perform this operation.',
            'QUOTA_EXCEEDED': 'Upload limit exceeded. Please try again later.',
            'NETWORK_ERROR': 'Network connection failed. Please check your internet connection.',
            'TIMEOUT_ERROR': 'The upload request timed out. Please try again.',
            'SERVICE_UNAVAILABLE': 'Cloudinary service is temporarily unavailable. Please try again later.',
            'INTERNAL_ERROR': 'An internal server error occurred. Please try again.',
            'UNKNOWN_ERROR': 'An unexpected error occurred during the upload process.'
        };

        return errorMessages[error.code] || error.message || 'An unknown error occurred';
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

    // Enhanced image loading with fallback
    async loadImageWithFallback(url, fallbackUrl = null) {
        if (!url) {
            return fallbackUrl || this.getPlaceholderImage();
        }

        return new Promise((resolve) => {
            const img = new Image();
            
            img.onload = () => {
                console.log('✅ Image loaded successfully:', url);
                resolve(url);
            };
            
            img.onerror = () => {
                console.warn('⚠️ Image failed to load, using fallback:', url);
                resolve(fallbackUrl || this.getPlaceholderImage());
            };
            
            // Set timeout for slow loading images
            setTimeout(() => {
                if (!img.complete) {
                    console.warn('⚠️ Image loading timeout, using fallback:', url);
                    resolve(fallbackUrl || this.getPlaceholderImage());
                }
            }, 10000); // 10 second timeout
            
            img.src = url;
        });
    }

    // Get placeholder image data URL
    getPlaceholderImage(width = 300, height = 200, text = 'Image') {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        
        // Background
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(0, 0, width, height);
        
        // Border
        ctx.strokeStyle = '#d1d5db';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, width - 2, height - 2);
        
        // Text
        ctx.fillStyle = '#6b7280';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, width / 2, height / 2);
        
        return canvas.toDataURL();
    }

    // Batch upload with enhanced error handling
    async batchUploadEnhanced(files, options = {}, progressCallback = null) {
        const results = [];
        const errors = [];
        const total = files.length;

        for (let i = 0; i < files.length; i++) {
            try {
                if (progressCallback) {
                    progressCallback({
                        stage: 'uploading',
                        current: i + 1,
                        total: total,
                        progress: Math.round(((i + 1) / total) * 100),
                        file: files[i].name
                    });
                }

                const result = await this.uploadSingleFile(files[i], {
                    ...options,
                    publicId: options.publicId ? `${options.publicId}_${i + 1}` : null
                });
                
                results.push(result);
                
            } catch (error) {
                console.error(`❌ Failed to upload ${files[i].name}:`, error);
                errors.push({ 
                    file: files[i].name, 
                    error: error.message,
                    index: i
                });
            }
        }

        if (progressCallback) {
            progressCallback({
                stage: 'complete',
                current: total,
                total: total,
                progress: 100,
                results: results.length,
                errors: errors.length
            });
        }

        return { 
            success: errors.length === 0,
            results, 
            errors,
            uploaded: results.length,
            failed: errors.length
        };
    }

    // Alias method for backward compatibility
    async uploadImage(file, options = {}) {
        return this.uploadSingleFile(file, options);
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
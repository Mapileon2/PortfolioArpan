/**
 * Cloudinary SDK Service - Complete End-to-End Implementation
 * Uses Cloudinary v2 SDK for robust image upload and management
 * Includes preview functionality, CRUD operations, and error handling
 */

class CloudinarySDKService {
    constructor() {
        this.config = {
            cloudName: 'dgymjtqil',
            apiKey: '951533987774134',
            apiSecret: 'jTPgMHSl-6m7LptvsBA5eDbOWwc',
            uploadPreset: 'ml_default'
        };
        
        this.uploadedImages = new Map(); // Store uploaded images for preview
        this.pendingUploads = new Map(); // Store pending uploads
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Cloudinary SDK Service...');
        
        // Load Cloudinary SDK if not already loaded
        await this.loadCloudinarySDK();
        
        // Initialize upload widget
        this.initializeUploadWidget();
        
        console.log('✅ Cloudinary SDK Service ready!');
    }

    async loadCloudinarySDK() {
        if (window.cloudinary) {
            console.log('✅ Cloudinary SDK already loaded');
            return;
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://upload-widget.cloudinary.com/global/all.js';
            script.onload = () => {
                console.log('✅ Cloudinary SDK loaded successfully');
                resolve();
            };
            script.onerror = () => {
                console.error('❌ Failed to load Cloudinary SDK');
                reject(new Error('Failed to load Cloudinary SDK'));
            };
            document.head.appendChild(script);
        });
    }

    initializeUploadWidget() {
        if (!window.cloudinary) {
            console.error('❌ Cloudinary SDK not loaded');
            return;
        }

        this.uploadWidget = window.cloudinary.createUploadWidget({
            cloudName: this.config.cloudName,
            uploadPreset: this.config.uploadPreset,
            multiple: true,
            maxFiles: 10,
            maxFileSize: 10000000, // 10MB
            sources: ['local', 'url', 'camera'],
            showAdvancedOptions: true,
            cropping: true,
            croppingAspectRatio: 16/9,
            folder: 'portfolio',
            tags: ['portfolio', 'auto-upload'],
            clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
            transformation: [
                { quality: 'auto:good' },
                { fetch_format: 'auto' }
            ]
        }, (error, result) => {
            this.handleUploadResult(error, result);
        });

        console.log('✅ Upload widget initialized');
    }

    handleUploadResult(error, result) {
        if (error) {
            console.error('❌ Upload error:', error);
            this.showNotification('error', `Upload failed: ${error.message}`);
            return;
        }

        if (result && result.event === 'success') {
            console.log('✅ Upload successful:', result.info);
            
            const imageData = {
                id: result.info.public_id,
                url: result.info.secure_url,
                publicId: result.info.public_id,
                width: result.info.width,
                height: result.info.height,
                format: result.info.format,
                size: result.info.bytes,
                folder: result.info.folder,
                tags: result.info.tags,
                createdAt: result.info.created_at,
                thumbnail: this.generateThumbnailUrl(result.info.public_id)
            };

            this.uploadedImages.set(result.info.public_id, imageData);
            this.showNotification('success', 'Image uploaded successfully!');
            
            // Trigger custom event for components to listen
            this.dispatchUploadEvent('upload-success', imageData);
        }
    }

    /**
     * Upload image with preview functionality
     * @param {File} file - Image file to upload
     * @param {Object} options - Upload options
     * @returns {Promise} Upload result with preview
     */
    async uploadImageWithPreview(file, options = {}) {
        try {
            console.log('🔄 Starting image upload with preview...');
            
            // Validate file
            this.validateFile(file);
            
            // Generate preview
            const preview = await this.generatePreview(file);
            
            // Create pending upload entry
            const uploadId = this.generateUploadId();
            const pendingUpload = {
                id: uploadId,
                file: file,
                preview: preview,
                status: 'pending',
                progress: 0,
                options: options
            };
            
            this.pendingUploads.set(uploadId, pendingUpload);
            
            // Dispatch preview event
            this.dispatchUploadEvent('preview-ready', pendingUpload);
            
            // Start upload
            const uploadResult = await this.performUpload(file, options, uploadId);
            
            // Update pending upload
            pendingUpload.status = 'completed';
            pendingUpload.result = uploadResult;
            
            // Store in uploaded images
            this.uploadedImages.set(uploadResult.publicId, uploadResult);
            
            // Clean up pending
            this.pendingUploads.delete(uploadId);
            
            console.log('✅ Upload with preview completed:', uploadResult);
            return uploadResult;
            
        } catch (error) {
            console.error('❌ Upload with preview failed:', error);
            throw error;
        }
    }

    /**
     * Perform actual upload to Cloudinary
     */
    async performUpload(file, options = {}, uploadId = null) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', this.config.uploadPreset);
        
        // Add options
        const folder = options.folder || 'portfolio/general';
        const tags = options.tags || ['portfolio'];
        
        formData.append('folder', folder);
        formData.append('tags', tags.join(','));
        
        // Add transformation if specified
        if (options.transformation) {
            formData.append('transformation', JSON.stringify(options.transformation));
        }

        // Upload with progress tracking
        const xhr = new XMLHttpRequest();
        
        return new Promise((resolve, reject) => {
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable && uploadId) {
                    const progress = Math.round((e.loaded / e.total) * 100);
                    const pendingUpload = this.pendingUploads.get(uploadId);
                    if (pendingUpload) {
                        pendingUpload.progress = progress;
                        this.dispatchUploadEvent('upload-progress', { uploadId, progress });
                    }
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    try {
                        const result = JSON.parse(xhr.responseText);
                        const imageData = {
                            id: result.public_id,
                            url: result.secure_url,
                            publicId: result.public_id,
                            width: result.width,
                            height: result.height,
                            format: result.format,
                            size: result.bytes,
                            folder: result.folder,
                            tags: result.tags,
                            createdAt: result.created_at,
                            thumbnail: this.generateThumbnailUrl(result.public_id),
                            originalFile: file.name
                        };
                        resolve(imageData);
                    } catch (parseError) {
                        reject(new Error('Failed to parse upload response'));
                    }
                } else {
                    try {
                        const error = JSON.parse(xhr.responseText);
                        reject(new Error(error.error?.message || 'Upload failed'));
                    } catch (parseError) {
                        reject(new Error(`Upload failed with status ${xhr.status}`));
                    }
                }
            });

            xhr.addEventListener('error', () => {
                reject(new Error('Network error during upload'));
            });

            xhr.open('POST', `https://api.cloudinary.com/v1_1/${this.config.cloudName}/image/upload`);
            xhr.send(formData);
        });
    }

    /**
     * Generate preview from file
     */
    async generatePreview(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Calculate thumbnail dimensions
                    const maxWidth = 300;
                    const maxHeight = 200;
                    let { width, height } = img;
                    
                    if (width > height) {
                        if (width > maxWidth) {
                            height = (height * maxWidth) / width;
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width = (width * maxHeight) / height;
                            height = maxHeight;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    resolve({
                        dataUrl: canvas.toDataURL('image/jpeg', 0.8),
                        width: img.naturalWidth,
                        height: img.naturalHeight,
                        size: file.size,
                        type: file.type,
                        name: file.name
                    });
                };
                img.onerror = () => reject(new Error('Failed to load image for preview'));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }

    /**
     * Validate file before upload
     */
    validateFile(file) {
        if (!file) {
            throw new Error('No file provided');
        }

        if (!file.type.startsWith('image/')) {
            throw new Error('File must be an image');
        }

        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            throw new Error('File size must be less than 10MB');
        }

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            throw new Error('File type not supported. Use JPEG, PNG, GIF, or WebP');
        }
    }

    /**
     * Delete image from Cloudinary
     */
    async deleteImage(publicId) {
        try {
            console.log(`🗑️ Deleting image: ${publicId}`);
            
            // Call server endpoint for deletion (requires signature)
            const response = await fetch('/api/cloudinary/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ publicId })
            });

            if (!response.ok) {
                throw new Error('Failed to delete image');
            }

            // Remove from local storage
            this.uploadedImages.delete(publicId);
            
            console.log('✅ Image deleted successfully');
            this.showNotification('success', 'Image deleted successfully');
            
            // Dispatch delete event
            this.dispatchUploadEvent('image-deleted', { publicId });
            
            return true;
        } catch (error) {
            console.error('❌ Delete failed:', error);
            this.showNotification('error', `Delete failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get all uploaded images
     */
    getUploadedImages() {
        return Array.from(this.uploadedImages.values());
    }

    /**
     * Get image by public ID
     */
    getImage(publicId) {
        return this.uploadedImages.get(publicId);
    }

    /**
     * Generate thumbnail URL
     */
    generateThumbnailUrl(publicId, options = {}) {
        const { width = 300, height = 200, crop = 'fill', quality = 'auto' } = options;
        return `https://res.cloudinary.com/${this.config.cloudName}/image/upload/w_${width},h_${height},c_${crop},q_${quality}/${publicId}`;
    }

    /**
     * Generate optimized URL
     */
    generateOptimizedUrl(publicId, options = {}) {
        const { width, height, quality = 'auto', format = 'auto' } = options;
        let transformation = `q_${quality},f_${format}`;
        
        if (width && height) {
            transformation += `,w_${width},h_${height},c_fill`;
        } else if (width) {
            transformation += `,w_${width}`;
        } else if (height) {
            transformation += `,h_${height}`;
        }
        
        return `https://res.cloudinary.com/${this.config.cloudName}/image/upload/${transformation}/${publicId}`;
    }

    /**
     * Open upload widget
     */
    openUploadWidget() {
        if (this.uploadWidget) {
            this.uploadWidget.open();
        } else {
            console.error('❌ Upload widget not initialized');
        }
    }

    /**
     * Utility methods
     */
    generateUploadId() {
        return 'upload_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    dispatchUploadEvent(eventName, data) {
        const event = new CustomEvent(`cloudinary-${eventName}`, {
            detail: data,
            bubbles: true
        });
        document.dispatchEvent(event);
    }

    showNotification(type, message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg text-white transform translate-x-full transition-transform duration-300 ${
            type === 'success' ? 'bg-green-500' : 
            type === 'error' ? 'bg-red-500' : 
            type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
        }`;
        
        notification.innerHTML = `
            <div class="flex items-center space-x-2">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-white hover:text-gray-200">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        document.body.appendChild(notification);
        
        // Slide in
        setTimeout(() => notification.classList.remove('translate-x-full'), 100);
        
        // Auto remove
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    /**
     * Batch upload multiple images
     */
    async batchUpload(files, options = {}) {
        const results = [];
        const errors = [];

        for (let i = 0; i < files.length; i++) {
            try {
                const result = await this.uploadImageWithPreview(files[i], {
                    ...options,
                    folder: options.folder || 'portfolio/batch'
                });
                results.push(result);
            } catch (error) {
                errors.push({
                    file: files[i].name,
                    error: error.message
                });
            }
        }

        return {
            successful: results,
            failed: errors,
            summary: {
                total: files.length,
                successful: results.length,
                failed: errors.length
            }
        };
    }

    /**
     * Create image gallery from uploaded images
     */
    createImageGallery(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`❌ Container ${containerId} not found`);
            return;
        }

        const images = this.getUploadedImages();
        const { columns = 3, showDelete = true, showInfo = true } = options;

        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-${columns} gap-4">
                ${images.map(image => `
                    <div class="relative group bg-white rounded-lg shadow-md overflow-hidden">
                        <img src="${image.thumbnail}" alt="${image.originalFile || 'Uploaded image'}" 
                             class="w-full h-48 object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                             onclick="window.cloudinarySDK.showImageModal('${image.publicId}')">
                        
                        ${showDelete ? `
                            <button onclick="window.cloudinarySDK.deleteImage('${image.publicId}')" 
                                    class="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-red-600">
                                <i class="fas fa-trash text-sm"></i>
                            </button>
                        ` : ''}
                        
                        ${showInfo ? `
                            <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-2 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                                <div class="text-sm truncate">${image.originalFile || 'Image'}</div>
                                <div class="text-xs text-gray-300">${image.width} × ${image.height} • ${(image.size / 1024 / 1024).toFixed(2)} MB</div>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Show image in modal
     */
    showImageModal(publicId) {
        const image = this.getImage(publicId);
        if (!image) return;

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="relative max-w-4xl max-h-full p-4">
                <img src="${image.url}" alt="${image.originalFile}" class="max-w-full max-h-full object-contain">
                <button onclick="this.parentElement.parentElement.remove()" 
                        class="absolute top-2 right-2 bg-white text-black rounded-full w-10 h-10 flex items-center justify-center hover:bg-gray-200">
                    <i class="fas fa-times"></i>
                </button>
                <div class="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white p-3 rounded">
                    <div class="font-semibold">${image.originalFile || 'Image'}</div>
                    <div class="text-sm text-gray-300">${image.width} × ${image.height} • ${(image.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Close on click outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
}

// Create global instance
window.cloudinarySDK = new CloudinarySDKService();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CloudinarySDKService;
}
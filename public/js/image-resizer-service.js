/**
 * Image Resizer Service with Cloudinary Integration
 * Provides comprehensive image resizing, cropping, and optimization
 */

class ImageResizerService {
    constructor() {
        this.config = {
            cloudName: 'dgymjtqil',
            apiKey: '951533987774134',
            uploadPreset: 'ml_default'
        };
        
        this.presets = {
            thumbnail: { width: 300, height: 200, crop: 'fill' },
            small: { width: 600, height: 400, crop: 'fill' },
            medium: { width: 1200, height: 800, crop: 'fill' },
            large: { width: 1920, height: 1080, crop: 'fill' },
            square: { width: 500, height: 500, crop: 'fill' },
            banner: { width: 1200, height: 400, crop: 'fill' },
            hero: { width: 1920, height: 600, crop: 'fill' }
        };
        
        this.init();
    }

    init() {
        console.log('🖼️ Image Resizer Service initialized');
    }

    /**
     * Upload image with resizing options
     */
    async uploadWithResize(file, options = {}) {
        try {
            console.log('🔄 Starting upload with resize...');
            
            // Validate file
            this.validateFile(file);
            
            // Prepare transformation
            const transformation = this.buildTransformation(options);
            
            // Create form data
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', this.config.uploadPreset);
            
            // Add folder and tags
            const folder = options.folder || 'portfolio/resized';
            const tags = options.tags || ['portfolio', 'resized'];
            
            formData.append('folder', folder);
            formData.append('tags', tags.join(','));
            
            // Add transformation as string (NOT JSON)
            if (transformation) {
                formData.append('transformation', transformation);
            }
            
            // Upload to Cloudinary
            const response = await fetch(`https://api.cloudinary.com/v1_1/${this.config.cloudName}/image/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `Upload failed: ${response.status}`);
            }

            const result = await response.json();
            
            console.log('✅ Upload with resize successful:', result.secure_url);
            
            return {
                success: true,
                url: result.secure_url,
                publicId: result.public_id,
                width: result.width,
                height: result.height,
                size: result.bytes,
                format: result.format,
                transformation: transformation,
                originalFile: file.name
            };
            
        } catch (error) {
            console.error('❌ Upload with resize failed:', error);
            throw error;
        }
    }

    /**
     * Build Cloudinary transformation string
     */
    buildTransformation(options) {
        const transformations = [];
        
        // Basic resize parameters
        if (options.width || options.height) {
            let transform = '';
            
            if (options.width) transform += `w_${options.width}`;
            if (options.height) transform += (transform ? ',' : '') + `h_${options.height}`;
            if (options.crop) transform += (transform ? ',' : '') + `c_${options.crop}`;
            
            transformations.push(transform);
        }
        
        // Quality optimization
        if (options.quality !== false) {
            transformations.push(`q_${options.quality || 'auto:good'}`);
        }
        
        // Format optimization
        if (options.format !== false) {
            transformations.push(`f_${options.format || 'auto'}`);
        }
        
        // Additional effects
        if (options.blur) transformations.push(`e_blur:${options.blur}`);
        if (options.brightness) transformations.push(`e_brightness:${options.brightness}`);
        if (options.contrast) transformations.push(`e_contrast:${options.contrast}`);
        if (options.saturation) transformations.push(`e_saturation:${options.saturation}`);
        
        // Gravity for cropping
        if (options.gravity) transformations.push(`g_${options.gravity}`);
        
        return transformations.length > 0 ? transformations.join('/') : null;
    }

    /**
     * Resize existing image by URL
     */
    generateResizedUrl(publicId, options = {}) {
        const transformation = this.buildTransformation(options);
        const baseUrl = `https://res.cloudinary.com/${this.config.cloudName}/image/upload`;
        
        if (transformation) {
            return `${baseUrl}/${transformation}/${publicId}`;
        }
        
        return `${baseUrl}/${publicId}`;
    }

    /**
     * Get preset transformation
     */
    getPresetTransformation(presetName) {
        return this.presets[presetName] || null;
    }

    /**
     * Upload with preset
     */
    async uploadWithPreset(file, presetName, additionalOptions = {}) {
        const preset = this.getPresetTransformation(presetName);
        if (!preset) {
            throw new Error(`Preset '${presetName}' not found`);
        }
        
        const options = { ...preset, ...additionalOptions };
        return await this.uploadWithResize(file, options);
    }

    /**
     * Create multiple sizes from one upload
     */
    async createMultipleSizes(file, sizes = ['thumbnail', 'medium', 'large'], options = {}) {
        const results = [];
        
        for (const size of sizes) {
            try {
                const preset = this.getPresetTransformation(size);
                if (preset) {
                    const sizeOptions = { 
                        ...preset, 
                        ...options,
                        folder: `${options.folder || 'portfolio'}/${size}`
                    };
                    
                    const result = await this.uploadWithResize(file, sizeOptions);
                    results.push({
                        size: size,
                        ...result
                    });
                }
            } catch (error) {
                console.error(`❌ Failed to create ${size} version:`, error);
                results.push({
                    size: size,
                    success: false,
                    error: error.message
                });
            }
        }
        
        return results;
    }

    /**
     * Show resize dialog
     */
    showResizeDialog(callback) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold text-gray-900">Image Resizer</h2>
                        <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times text-2xl"></i>
                        </button>
                    </div>
                    
                    <!-- File Upload -->
                    <div class="mb-6">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Select Image</label>
                        <input type="file" id="resizeFileInput" accept="image/*" 
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    </div>
                    
                    <!-- Preset Options -->
                    <div class="mb-6">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Quick Presets</label>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                            ${Object.keys(this.presets).map(preset => `
                                <button onclick="selectPreset('${preset}')" 
                                        class="preset-btn px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                                    ${preset.charAt(0).toUpperCase() + preset.slice(1)}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                    
                    <!-- Custom Dimensions -->
                    <div class="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Width (px)</label>
                            <input type="number" id="resizeWidth" placeholder="1920" 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Height (px)</label>
                            <input type="number" id="resizeHeight" placeholder="1080" 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        </div>
                    </div>
                    
                    <!-- Crop Mode -->
                    <div class="mb-6">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Crop Mode</label>
                        <select id="resizeCrop" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option value="fill">Fill (crop to exact size)</option>
                            <option value="fit">Fit (maintain aspect ratio)</option>
                            <option value="scale">Scale (may distort)</option>
                            <option value="crop">Crop (center crop)</option>
                            <option value="pad">Pad (add padding)</option>
                        </select>
                    </div>
                    
                    <!-- Quality -->
                    <div class="mb-6">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Quality</label>
                        <select id="resizeQuality" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option value="auto:good">Auto Good</option>
                            <option value="auto:best">Auto Best</option>
                            <option value="auto:eco">Auto Eco</option>
                            <option value="100">100% (Highest)</option>
                            <option value="80">80% (High)</option>
                            <option value="60">60% (Medium)</option>
                            <option value="40">40% (Low)</option>
                        </select>
                    </div>
                    
                    <!-- Multiple Sizes Option -->
                    <div class="mb-6">
                        <label class="flex items-center">
                            <input type="checkbox" id="createMultipleSizes" class="mr-2">
                            <span class="text-sm font-medium text-gray-700">Create multiple sizes (thumbnail, medium, large)</span>
                        </label>
                    </div>
                    
                    <!-- Preview -->
                    <div id="resizePreview" class="mb-6 hidden">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Preview</label>
                        <div class="border border-gray-300 rounded-lg p-4 text-center">
                            <img id="previewImage" class="max-w-full max-h-48 mx-auto rounded">
                        </div>
                    </div>
                    
                    <!-- Actions -->
                    <div class="flex justify-end space-x-3">
                        <button onclick="this.closest('.fixed').remove()" 
                                class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
                            Cancel
                        </button>
                        <button onclick="processResize()" 
                                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                            <i class="fas fa-magic mr-2"></i>Resize & Upload
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Setup event listeners
        this.setupResizeDialogEvents(modal, callback);
    }

    setupResizeDialogEvents(modal, callback) {
        const fileInput = modal.querySelector('#resizeFileInput');
        const previewDiv = modal.querySelector('#resizePreview');
        const previewImg = modal.querySelector('#previewImage');
        
        // File selection
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    previewImg.src = e.target.result;
                    previewDiv.classList.remove('hidden');
                };
                reader.readAsDataURL(file);
            }
        });
        
        // Preset selection
        window.selectPreset = (presetName) => {
            const preset = this.presets[presetName];
            if (preset) {
                modal.querySelector('#resizeWidth').value = preset.width;
                modal.querySelector('#resizeHeight').value = preset.height;
                modal.querySelector('#resizeCrop').value = preset.crop;
            }
            
            // Update button styles
            modal.querySelectorAll('.preset-btn').forEach(btn => {
                btn.classList.remove('bg-blue-500', 'text-white');
                btn.classList.add('border-gray-300', 'hover:bg-gray-50');
            });
            
            const selectedBtn = modal.querySelector(`[onclick="selectPreset('${presetName}')"]`);
            if (selectedBtn) {
                selectedBtn.classList.add('bg-blue-500', 'text-white');
                selectedBtn.classList.remove('border-gray-300', 'hover:bg-gray-50');
            }
        };
        
        // Process resize
        window.processResize = async () => {
            const file = fileInput.files[0];
            if (!file) {
                alert('Please select an image file');
                return;
            }
            
            const width = parseInt(modal.querySelector('#resizeWidth').value) || null;
            const height = parseInt(modal.querySelector('#resizeHeight').value) || null;
            const crop = modal.querySelector('#resizeCrop').value;
            const quality = modal.querySelector('#resizeQuality').value;
            const createMultiple = modal.querySelector('#createMultipleSizes').checked;
            
            try {
                const button = modal.querySelector('[onclick="processResize()"]');
                button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...';
                button.disabled = true;
                
                let result;
                
                if (createMultiple) {
                    result = await this.createMultipleSizes(file, ['thumbnail', 'medium', 'large'], {
                        quality: quality,
                        crop: crop
                    });
                } else {
                    result = await this.uploadWithResize(file, {
                        width: width,
                        height: height,
                        crop: crop,
                        quality: quality
                    });
                }
                
                modal.remove();
                
                if (callback) {
                    callback(result);
                }
                
                // Clean up global functions
                delete window.selectPreset;
                delete window.processResize;
                
            } catch (error) {
                alert(`Resize failed: ${error.message}`);
                
                const button = modal.querySelector('[onclick="processResize()"]');
                button.innerHTML = '<i class="fas fa-magic mr-2"></i>Resize & Upload';
                button.disabled = false;
            }
        };
    }

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

    showNotification(type, message) {
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
        
        setTimeout(() => notification.classList.remove('translate-x-full'), 100);
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
}

// Create global instance
window.imageResizerService = new ImageResizerService();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageResizerService;
}
/**
 * Carousel Upload Fix for Admin Dashboard
 * Add this script to fix the carousel image uploading functionality
 */

// Cloudinary configuration using your custom "Carousel" preset
const CLOUDINARY_CONFIG = {
    cloudName: 'dgymjtqil',
    uploadPreset: 'Carousel', // Your custom preset name
    apiKey: '951533987774134',
    // Custom preset settings
    folder: 'carou', // Your custom folder
    overwrite: false,
    useFilename: false,
    uniqueFilename: false,
    useFilenameAsDisplayName: true,
    useAssetFolderAsPublicIdPrefix: false
};

// Load Cloudinary SDK if not already loaded
function loadCloudinarySDK() {
    return new Promise((resolve, reject) => {
        if (window.cloudinary) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://upload-widget.cloudinary.com/global/all.js';
        script.onload = () => {
            console.log('✅ Cloudinary SDK loaded');
            resolve();
        };
        script.onerror = () => {
            console.error('❌ Failed to load Cloudinary SDK');
            reject(new Error('Failed to load Cloudinary SDK'));
        };
        document.head.appendChild(script);
    });
}

// Initialize Cloudinary upload widget
let cloudinaryWidget = null;

async function initializeCloudinaryWidget() {
    try {
        await loadCloudinarySDK();
        
        cloudinaryWidget = window.cloudinary.createUploadWidget({
            cloudName: CLOUDINARY_CONFIG.cloudName,
            uploadPreset: CLOUDINARY_CONFIG.uploadPreset, // Using your "Carousel" preset
            multiple: true,
            maxFiles: 10,
            maxFileSize: 10000000, // 10MB
            sources: ['local', 'url', 'camera'],
            folder: CLOUDINARY_CONFIG.folder, // "carou" folder from your preset
            tags: ['carousel', 'portfolio'],
            clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
            transformation: [
                { width: 1200, height: 600, crop: 'fill' },
                { quality: 'auto:good' },
                { fetch_format: 'auto' }
            ],
            // Apply your preset settings
            overwrite: CLOUDINARY_CONFIG.overwrite,
            useFilename: CLOUDINARY_CONFIG.useFilename,
            uniqueFilename: CLOUDINARY_CONFIG.uniqueFilename,
            useFilenameAsDisplayName: CLOUDINARY_CONFIG.useFilenameAsDisplayName
        }, handleCloudinaryUpload);

        console.log('✅ Cloudinary widget initialized');
    } catch (error) {
        console.error('❌ Failed to initialize Cloudinary widget:', error);
        showNotification('error', 'Failed to initialize upload widget');
    }
}

// Handle Cloudinary upload results
function handleCloudinaryUpload(error, result) {
    if (error) {
        console.error('❌ Upload error:', error);
        showNotification('error', `Upload failed: ${error.message}`);
        return;
    }

    if (result && result.event === 'success') {
        console.log('✅ Upload successful:', result.info);
        
        const imageData = {
            id: result.info.public_id,
            publicId: result.info.public_id,
            url: result.info.secure_url,
            thumbnail: generateThumbnailUrl(result.info.public_id),
            title: result.info.original_filename || 'Carousel Image',
            description: '',
            width: result.info.width,
            height: result.info.height,
            size: result.info.bytes,
            format: result.info.format,
            createdAt: result.info.created_at,
            isActive: true,
            order: 0
        };

        // Add to carousel images array
        if (window.dashboard && window.dashboard.carouselImages) {
            window.dashboard.carouselImages.push(imageData);
        } else {
            // Create carousel images array if it doesn't exist
            window.carouselImages = window.carouselImages || [];
            window.carouselImages.push(imageData);
        }

        // Save to database
        saveCarouselImageToDatabase(imageData);
        
        // Update UI
        if (window.dashboard) {
            window.dashboard.renderCarouselImages();
            window.dashboard.renderCarouselPreview();
        }
        
        showNotification('success', 'Image uploaded successfully!');
    }
}

// Generate thumbnail URL
function generateThumbnailUrl(publicId) {
    return `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/image/upload/w_300,h_200,c_fill,q_auto/${publicId}`;
}

// Save image to database
async function saveCarouselImageToDatabase(imageData) {
    try {
        const response = await fetch('/api/carousel/images', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                publicId: imageData.publicId,
                url: imageData.url,
                thumbnail: imageData.thumbnail,
                title: imageData.title,
                description: imageData.description,
                width: imageData.width,
                height: imageData.height,
                size: imageData.size,
                isActive: imageData.isActive,
                order: imageData.order
            })
        });

        if (response.ok) {
            console.log('✅ Image saved to database');
        } else {
            console.error('❌ Failed to save to database:', response.status);
        }
    } catch (error) {
        console.error('❌ Database save error:', error);
    }
}

// Load existing carousel images from API
async function loadCarouselImagesFromAPI() {
    try {
        const response = await fetch('/api/carousel/images');
        if (response.ok) {
            const result = await response.json();
            const images = result.data || result || [];
            
            // Convert to expected format
            const formattedImages = images.map(img => ({
                id: img.id || img.public_id,
                publicId: img.public_id || img.publicId,
                url: img.secure_url || img.url,
                thumbnail: img.thumbnail || generateThumbnailUrl(img.public_id || img.publicId),
                title: img.title || 'Carousel Image',
                description: img.description || '',
                width: img.width,
                height: img.height,
                size: img.bytes || img.size,
                isActive: img.is_active !== false,
                order: img.order_index || img.order || 0,
                createdAt: img.created_at || img.createdAt
            }));

            // Update dashboard
            if (window.dashboard) {
                window.dashboard.carouselImages = formattedImages;
                window.dashboard.renderCarouselImages();
                window.dashboard.renderCarouselPreview();
            } else {
                window.carouselImages = formattedImages;
            }

            console.log(`✅ Loaded ${formattedImages.length} carousel images from API`);
        }
    } catch (error) {
        console.error('❌ Failed to load carousel images:', error);
    }
}

// Fixed carousel upload function
function openCarouselUploadFixed() {
    if (cloudinaryWidget) {
        cloudinaryWidget.open();
    } else {
        showNotification('error', 'Upload widget not ready. Please wait...');
        // Try to initialize if not done yet
        initializeCloudinaryWidget().then(() => {
            if (cloudinaryWidget) {
                cloudinaryWidget.open();
            }
        });
    }
}

// Direct file upload (fallback)
async function uploadCarouselFilesDirect(files) {
    for (const file of files) {
        try {
            showNotification('info', `Uploading ${file.name}...`);
            
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset); // "Carousel" preset
            formData.append('folder', CLOUDINARY_CONFIG.folder); // "carou" folder
            formData.append('tags', 'carousel,portfolio');
            
            // Apply preset-specific settings
            if (CLOUDINARY_CONFIG.useFilenameAsDisplayName) {
                formData.append('use_filename_as_display_name', 'true');
            }
            if (!CLOUDINARY_CONFIG.overwrite) {
                formData.append('overwrite', 'false');
            }
            if (!CLOUDINARY_CONFIG.uniqueFilename) {
                formData.append('unique_filename', 'false');
            }

            const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.error) {
                throw new Error(result.error.message);
            }

            const imageData = {
                id: result.public_id,
                publicId: result.public_id,
                url: result.secure_url,
                thumbnail: generateThumbnailUrl(result.public_id),
                title: file.name.replace(/\.[^/.]+$/, ""),
                description: '',
                width: result.width,
                height: result.height,
                size: result.bytes,
                format: result.format,
                createdAt: result.created_at,
                isActive: true,
                order: 0
            };

            // Add to carousel
            if (window.dashboard && window.dashboard.carouselImages) {
                window.dashboard.carouselImages.push(imageData);
            } else {
                window.carouselImages = window.carouselImages || [];
                window.carouselImages.push(imageData);
            }

            // Save to database
            await saveCarouselImageToDatabase(imageData);
            
            showNotification('success', `${file.name} uploaded successfully!`);
        } catch (error) {
            console.error(`❌ Failed to upload ${file.name}:`, error);
            showNotification('error', `Failed to upload ${file.name}: ${error.message}`);
        }
    }

    // Update UI
    if (window.dashboard) {
        window.dashboard.renderCarouselImages();
        window.dashboard.renderCarouselPreview();
    }
}

// Notification helper
function showNotification(type, message) {
    // Try to use existing notification system
    if (window.dashboard && typeof window.dashboard.showAlert === 'function') {
        window.dashboard.showAlert(type, message);
        return;
    }

    // Fallback notification
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

// Override existing functions
window.openCarouselUpload = openCarouselUploadFixed;
window.handleCarouselFiles = uploadCarouselFilesDirect;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔧 Carousel upload fix loading...');
    
    // Initialize Cloudinary widget
    initializeCloudinaryWidget();
    
    // Load existing images
    loadCarouselImagesFromAPI();
    
    // Fix drag and drop
    const dropZone = document.getElementById('carouselDropZone');
    if (dropZone) {
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('border-blue-500', 'bg-blue-50');
            
            const files = Array.from(e.dataTransfer.files).filter(file => 
                file.type.startsWith('image/')
            );
            
            if (files.length > 0) {
                uploadCarouselFilesDirect(files);
            }
        });
    }
    
    console.log('✅ Carousel upload fix ready!');
});

// Export for global access
window.carouselUploadFix = {
    openUpload: openCarouselUploadFixed,
    uploadFiles: uploadCarouselFilesDirect,
    loadImages: loadCarouselImagesFromAPI,
    initWidget: initializeCloudinaryWidget
};
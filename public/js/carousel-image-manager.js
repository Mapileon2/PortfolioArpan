/**
 * Carousel Image Manager
 * Complete integration with Cloudinary SDK for carousel image management
 * Includes preview, upload, CRUD operations, and drag-drop functionality
 */

class CarouselImageManager {
    constructor() {
        this.images = [];
        this.currentIndex = 0;
        this.isEditing = false;
        this.draggedItem = null;
        
        this.init();
    }

    async init() {
        console.log('🎠 Initializing Carousel Image Manager...');
        
        // Wait for Cloudinary SDK to be ready
        await this.waitForCloudinarySDK();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load existing carousel images
        await this.loadCarouselImages();
        
        // Render carousel
        this.renderCarousel();
        
        console.log('✅ Carousel Image Manager ready!');
    }

    async waitForCloudinarySDK() {
        let attempts = 0;
        while (!window.cloudinarySDK && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.cloudinarySDK) {
            console.error('❌ Cloudinary SDK not available');
            throw new Error('Cloudinary SDK not loaded');
        }
    }

    setupEventListeners() {
        // Listen for Cloudinary upload events
        document.addEventListener('cloudinary-upload-success', (e) => {
            this.handleImageUpload(e.detail);
        });

        document.addEventListener('cloudinary-image-deleted', (e) => {
            this.handleImageDelete(e.detail.publicId);
        });

        // Setup drag and drop
        this.setupDragAndDrop();
    }

    setupDragAndDrop() {
        const dropZone = document.getElementById('carouselDropZone');
        if (!dropZone) return;

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', async (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            
            const files = Array.from(e.dataTransfer.files).filter(file => 
                file.type.startsWith('image/')
            );

            if (files.length > 0) {
                await this.uploadMultipleImages(files);
            }
        });
    }

    async loadCarouselImages() {
        try {
            console.log('📋 Loading carousel images...');
            
            const response = await fetch('/api/cloudinary/images?folder=portfolio/carousel&limit=20');
            
            if (response.ok) {
                const result = await response.json();
                this.images = result.data.map(img => ({
                    id: img.public_id,
                    url: img.secure_url,
                    thumbnail: img.thumbnail,
                    title: img.original_filename || 'Carousel Image',
                    description: '',
                    publicId: img.public_id,
                    width: img.width,
                    height: img.height,
                    size: img.bytes,
                    createdAt: img.created_at,
                    isActive: true,
                    order: this.images.length
                }));
                
                console.log(`✅ Loaded ${this.images.length} carousel images`);
            } else {
                console.warn('⚠️ Failed to load carousel images, using empty array');
                this.images = [];
            }
        } catch (error) {
            console.error('❌ Error loading carousel images:', error);
            this.images = [];
        }
    }

    async uploadSingleImage() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                await this.processImageUpload(file);
            }
        };
        
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    }

    async uploadMultipleImages(files) {
        const uploadPromises = files.map(file => this.processImageUpload(file));
        await Promise.all(uploadPromises);
    }

    async processImageUpload(file) {
        try {
            console.log(`🔄 Processing upload: ${file.name}`);
            
            // Show upload progress
            this.showUploadProgress(file.name);
            
            // Upload with preview
            const result = await window.cloudinarySDK.uploadImageWithPreview(file, {
                folder: 'portfolio/carousel',
                tags: ['carousel', 'portfolio'],
                transformation: [
                    { width: 1920, height: 1080, crop: 'fill' },
                    { quality: 'auto:good' },
                    { fetch_format: 'auto' }
                ]
            });

            // Add to carousel
            const carouselImage = {
                id: result.publicId,
                url: result.url,
                thumbnail: result.thumbnail,
                title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
                description: '',
                publicId: result.publicId,
                width: result.width,
                height: result.height,
                size: result.size,
                createdAt: new Date().toISOString(),
                isActive: true,
                order: this.images.length
            };

            this.images.push(carouselImage);
            
            // Save to database
            await this.saveCarouselImage(carouselImage);
            
            // Re-render carousel
            this.renderCarousel();
            
            console.log(`✅ Carousel image added: ${result.publicId}`);
            
        } catch (error) {
            console.error(`❌ Failed to process upload: ${file.name}`, error);
            this.showNotification('error', `Failed to upload ${file.name}: ${error.message}`);
        }
    }

    async saveCarouselImage(imageData) {
        try {
            const response = await fetch('/api/carousel/images', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(imageData)
            });

            if (!response.ok) {
                throw new Error('Failed to save carousel image');
            }

            console.log('✅ Carousel image saved to database');
        } catch (error) {
            console.error('❌ Failed to save carousel image:', error);
            // Don't throw - allow the image to be added to UI even if DB save fails
        }
    }

    handleImageUpload(imageData) {
        // This is called when an image is uploaded via the global Cloudinary service
        if (imageData.folder && imageData.folder.includes('carousel')) {
            const carouselImage = {
                id: imageData.publicId,
                url: imageData.url,
                thumbnail: imageData.thumbnail,
                title: imageData.originalFile || 'Carousel Image',
                description: '',
                publicId: imageData.publicId,
                width: imageData.width,
                height: imageData.height,
                size: imageData.size,
                createdAt: imageData.createdAt,
                isActive: true,
                order: this.images.length
            };

            this.images.push(carouselImage);
            this.renderCarousel();
        }
    }

    handleImageDelete(publicId) {
        this.images = this.images.filter(img => img.publicId !== publicId);
        this.renderCarousel();
    }

    renderCarousel() {
        this.renderCarouselEditor();
        this.renderCarouselPreview();
    }

    renderCarouselEditor() {
        const container = document.getElementById('carouselEditor');
        if (!container) return;

        container.innerHTML = `
            <div class="bg-white rounded-lg shadow-lg p-6">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-900">Carousel Manager</h2>
                    <div class="flex space-x-3">
                        <button onclick="window.carouselManager.uploadSingleImage()" 
                                class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                            <i class="fas fa-plus mr-2"></i>Add Image
                        </button>
                        <button onclick="window.carouselManager.toggleEditMode()" 
                                class="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition">
                            <i class="fas fa-edit mr-2"></i>${this.isEditing ? 'Done' : 'Edit'}
                        </button>
                    </div>
                </div>

                <!-- Drop Zone -->
                <div id="carouselDropZone" class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6 transition-colors hover:border-blue-500">
                    <i class="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-4"></i>
                    <h3 class="text-lg font-semibold text-gray-900 mb-2">Drop Images Here</h3>
                    <p class="text-gray-600">Or click "Add Image" to select files</p>
                </div>

                <!-- Image Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    ${this.images.map((image, index) => this.renderImageCard(image, index)).join('')}
                </div>

                ${this.images.length === 0 ? `
                    <div class="text-center py-12">
                        <i class="fas fa-images text-6xl text-gray-300 mb-4"></i>
                        <h3 class="text-xl font-semibold text-gray-600 mb-2">No Images Yet</h3>
                        <p class="text-gray-500">Upload your first carousel image to get started</p>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderImageCard(image, index) {
        return `
            <div class="relative group bg-white rounded-lg shadow-md overflow-hidden ${this.isEditing ? 'cursor-move' : ''}" 
                 draggable="${this.isEditing}" 
                 data-index="${index}"
                 ondragstart="window.carouselManager.handleDragStart(event, ${index})"
                 ondragover="window.carouselManager.handleDragOver(event)"
                 ondrop="window.carouselManager.handleDrop(event, ${index})">
                
                <img src="${image.thumbnail}" alt="${image.title}" 
                     class="w-full h-48 object-cover">
                
                <!-- Overlay Controls -->
                <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center">
                    <div class="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex space-x-2">
                        <button onclick="window.carouselManager.previewImage(${index})" 
                                class="bg-white text-gray-900 rounded-full w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="window.carouselManager.editImage(${index})" 
                                class="bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-blue-600 transition">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="window.carouselManager.deleteImage(${index})" 
                                class="bg-red-500 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-red-600 transition">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>

                <!-- Image Info -->
                <div class="p-4">
                    <h4 class="font-semibold text-gray-900 truncate">${image.title}</h4>
                    <p class="text-sm text-gray-600 truncate">${image.description || 'No description'}</p>
                    <div class="flex justify-between items-center mt-2">
                        <span class="text-xs text-gray-500">${image.width} × ${image.height}</span>
                        <label class="flex items-center">
                            <input type="checkbox" ${image.isActive ? 'checked' : ''} 
                                   onchange="window.carouselManager.toggleImageActive(${index})"
                                   class="mr-1">
                            <span class="text-xs text-gray-600">Active</span>
                        </label>
                    </div>
                </div>

                <!-- Order Badge -->
                ${this.isEditing ? `
                    <div class="absolute top-2 left-2 bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                        ${index + 1}
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderCarouselPreview() {
        const container = document.getElementById('carouselPreview');
        if (!container) return;

        const activeImages = this.images.filter(img => img.isActive);

        if (activeImages.length === 0) {
            container.innerHTML = `
                <div class="bg-gray-100 rounded-lg p-12 text-center">
                    <i class="fas fa-images text-4xl text-gray-400 mb-4"></i>
                    <h3 class="text-lg font-semibold text-gray-600">No Active Images</h3>
                    <p class="text-gray-500">Add and activate images to see the carousel preview</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="bg-white rounded-lg shadow-lg overflow-hidden">
                <div class="relative">
                    <!-- Carousel Container -->
                    <div class="relative h-96 overflow-hidden">
                        ${activeImages.map((image, index) => `
                            <div class="carousel-slide absolute inset-0 transition-transform duration-500 ${index === this.currentIndex ? 'translate-x-0' : index < this.currentIndex ? '-translate-x-full' : 'translate-x-full'}">
                                <img src="${image.url}" alt="${image.title}" class="w-full h-full object-cover">
                                <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-6">
                                    <h3 class="text-white text-2xl font-bold mb-2">${image.title}</h3>
                                    ${image.description ? `<p class="text-white text-opacity-90">${image.description}</p>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <!-- Navigation Arrows -->
                    ${activeImages.length > 1 ? `
                        <button onclick="window.carouselManager.previousSlide()" 
                                class="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full w-12 h-12 flex items-center justify-center hover:bg-opacity-75 transition">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <button onclick="window.carouselManager.nextSlide()" 
                                class="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full w-12 h-12 flex items-center justify-center hover:bg-opacity-75 transition">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    ` : ''}

                    <!-- Dots Indicator -->
                    ${activeImages.length > 1 ? `
                        <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                            ${activeImages.map((_, index) => `
                                <button onclick="window.carouselManager.goToSlide(${index})" 
                                        class="w-3 h-3 rounded-full transition ${index === this.currentIndex ? 'bg-white' : 'bg-white bg-opacity-50'}"></button>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>

                <!-- Carousel Controls -->
                <div class="p-4 bg-gray-50 flex justify-between items-center">
                    <div class="text-sm text-gray-600">
                        ${activeImages.length} active image${activeImages.length !== 1 ? 's' : ''}
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="window.carouselManager.startAutoplay()" 
                                class="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 transition">
                            <i class="fas fa-play mr-1"></i>Auto Play
                        </button>
                        <button onclick="window.carouselManager.stopAutoplay()" 
                                class="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition">
                            <i class="fas fa-stop mr-1"></i>Stop
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Carousel Navigation
    nextSlide() {
        const activeImages = this.images.filter(img => img.isActive);
        this.currentIndex = (this.currentIndex + 1) % activeImages.length;
        this.renderCarouselPreview();
    }

    previousSlide() {
        const activeImages = this.images.filter(img => img.isActive);
        this.currentIndex = this.currentIndex === 0 ? activeImages.length - 1 : this.currentIndex - 1;
        this.renderCarouselPreview();
    }

    goToSlide(index) {
        this.currentIndex = index;
        this.renderCarouselPreview();
    }

    // Auto-play functionality
    startAutoplay() {
        this.stopAutoplay(); // Clear any existing interval
        this.autoplayInterval = setInterval(() => {
            this.nextSlide();
        }, 5000);
        this.showNotification('success', 'Autoplay started');
    }

    stopAutoplay() {
        if (this.autoplayInterval) {
            clearInterval(this.autoplayInterval);
            this.autoplayInterval = null;
            this.showNotification('info', 'Autoplay stopped');
        }
    }

    // Image Management
    toggleEditMode() {
        this.isEditing = !this.isEditing;
        this.renderCarousel();
    }

    toggleImageActive(index) {
        this.images[index].isActive = !this.images[index].isActive;
        this.renderCarouselPreview();
        this.saveImageOrder();
    }

    previewImage(index) {
        const image = this.images[index];
        window.cloudinarySDK.showImageModal(image.publicId);
    }

    editImage(index) {
        const image = this.images[index];
        this.showEditModal(image, index);
    }

    async deleteImage(index) {
        const image = this.images[index];
        
        if (confirm(`Are you sure you want to delete "${image.title}"?`)) {
            try {
                // Delete from Cloudinary
                await window.cloudinarySDK.deleteImage(image.publicId);
                
                // Remove from local array
                this.images.splice(index, 1);
                
                // Re-render
                this.renderCarousel();
                
                this.showNotification('success', 'Image deleted successfully');
            } catch (error) {
                console.error('❌ Failed to delete image:', error);
                this.showNotification('error', 'Failed to delete image');
            }
        }
    }

    // Drag and Drop for reordering
    handleDragStart(event, index) {
        this.draggedItem = index;
        event.dataTransfer.effectAllowed = 'move';
    }

    handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }

    handleDrop(event, dropIndex) {
        event.preventDefault();
        
        if (this.draggedItem !== null && this.draggedItem !== dropIndex) {
            // Reorder images
            const draggedImage = this.images[this.draggedItem];
            this.images.splice(this.draggedItem, 1);
            this.images.splice(dropIndex, 0, draggedImage);
            
            // Update order values
            this.images.forEach((img, index) => {
                img.order = index;
            });
            
            // Re-render
            this.renderCarousel();
            
            // Save new order
            this.saveImageOrder();
            
            this.showNotification('success', 'Image order updated');
        }
        
        this.draggedItem = null;
    }

    showEditModal(image, index) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold text-gray-900">Edit Carousel Image</h2>
                        <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times text-2xl"></i>
                        </button>
                    </div>
                    
                    <div class="space-y-6">
                        <div class="text-center">
                            <img src="${image.thumbnail}" alt="${image.title}" class="max-w-full h-48 object-cover rounded-lg mx-auto">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Title</label>
                            <input type="text" id="editTitle" value="${image.title}" 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                            <textarea id="editDescription" rows="3" 
                                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">${image.description}</textarea>
                        </div>
                        
                        <div class="flex items-center">
                            <input type="checkbox" id="editActive" ${image.isActive ? 'checked' : ''} class="mr-2">
                            <label for="editActive" class="text-sm font-medium text-gray-700">Show in carousel</label>
                        </div>
                        
                        <div class="flex justify-end space-x-3">
                            <button onclick="this.closest('.fixed').remove()" 
                                    class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
                                Cancel
                            </button>
                            <button onclick="window.carouselManager.saveImageEdit(${index}); this.closest('.fixed').remove();" 
                                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    saveImageEdit(index) {
        const title = document.getElementById('editTitle').value;
        const description = document.getElementById('editDescription').value;
        const isActive = document.getElementById('editActive').checked;
        
        this.images[index].title = title;
        this.images[index].description = description;
        this.images[index].isActive = isActive;
        
        this.renderCarousel();
        this.saveImageOrder();
        
        this.showNotification('success', 'Image updated successfully');
    }

    async saveImageOrder() {
        try {
            const response = await fetch('/api/carousel/order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    images: this.images.map((img, index) => ({
                        publicId: img.publicId,
                        order: index,
                        title: img.title,
                        description: img.description,
                        isActive: img.isActive
                    }))
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save image order');
            }

            console.log('✅ Image order saved');
        } catch (error) {
            console.error('❌ Failed to save image order:', error);
        }
    }

    showUploadProgress(filename) {
        // Implementation for upload progress UI
        console.log(`📤 Uploading: ${filename}`);
    }

    showNotification(type, message) {
        // Use the global notification system
        if (window.cloudinarySDK) {
            window.cloudinarySDK.showNotification(type, message);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    // Public API
    getImages() {
        return this.images;
    }

    getActiveImages() {
        return this.images.filter(img => img.isActive);
    }

    addImage(imageData) {
        this.images.push(imageData);
        this.renderCarousel();
    }

    removeImage(publicId) {
        this.images = this.images.filter(img => img.publicId !== publicId);
        this.renderCarousel();
    }
}

// Create global instance
window.carouselManager = new CarouselImageManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CarouselImageManager;
}
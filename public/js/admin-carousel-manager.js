/**
 * Admin Carousel Manager - Integrated with Admin Dashboard
 * Manages carousel images and syncs with homepage
 */

class AdminCarouselManager {
    constructor() {
        this.config = {
            cloudName: 'dgymjtqil',
            uploadPreset: 'Carousel',
            folder: 'carou',
            apiBase: '/api/carousel'
        };
        
        this.state = {
            items: [],
            selectedItems: new Set(),
            currentPreviewIndex: 0,
            autoplayInterval: null,
            isAutoplay: false
        };
        
        this.uploadWidget = null;
        this.init();
    }

    async init() {
        console.log('🎠 Initializing Admin Carousel Manager...');
        
        // Wait for Cloudinary to load
        if (typeof window.cloudinary === 'undefined') {
            await this.loadCloudinary();
        }
        
        this.initializeUploadWidget();
        this.setupEventListeners();
        await this.loadCarouselItems();
        this.updateStats();
        
        console.log('✅ Admin Carousel Manager ready');
    }

    async loadCloudinary() {
        return new Promise((resolve) => {
            if (typeof window.cloudinary !== 'undefined') {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://upload-widget.cloudinary.com/global/all.js';
            script.onload = resolve;
            document.head.appendChild(script);
        });
    }

    initializeUploadWidget() {
        this.uploadWidget = window.cloudinary.createUploadWidget({
            cloudName: this.config.cloudName,
            uploadPreset: this.config.uploadPreset,
            folder: this.config.folder,
            multiple: true,
            maxFiles: 20,
            sources: ['local', 'url', 'camera'],
            clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
            transformation: [
                { width: 1920, height: 1080, crop: 'fill' },
                { quality: 'auto:good' },
                { fetch_format: 'auto' }
            ],
            styles: {
                palette: {
                    window: "#FFFFFF",
                    windowBorder: "#90A0B3",
                    tabIcon: "#0078FF",
                    menuIcons: "#5A616A",
                    link: "#0078FF",
                    action: "#FF620C"
                }
            }
        }, (error, result) => this.handleUploadResult(error, result));
    }

    setupEventListeners() {
        // Upload buttons
        document.getElementById('carouselBulkUpload')?.addEventListener('click', () => this.openUploadWidget());
        document.getElementById('carouselAddFirst')?.addEventListener('click', () => this.openUploadWidget());
        
        // Preview controls
        document.getElementById('carouselPreview')?.addEventListener('click', () => this.openPreviewModal());
        document.getElementById('carouselPreviewPrev')?.addEventListener('click', () => this.previewPrevious());
        document.getElementById('carouselPreviewNext')?.addEventListener('click', () => this.previewNext());
        document.getElementById('carouselAutoplay')?.addEventListener('click', () => this.toggleAutoplay());
        
        // Sync and save
        document.getElementById('carouselSync')?.addEventListener('click', () => this.syncToHomepage());
        document.getElementById('carouselSaveOrder')?.addEventListener('click', () => this.saveOrder());
    }

    openUploadWidget() {
        if (this.uploadWidget) {
            this.uploadWidget.open();
        }
    }

    async handleUploadResult(error, result) {
        if (error) {
            console.error('Upload error:', error);
            this.showNotification('error', 'Upload failed: ' + error.message);
            return;
        }

        if (result && result.event === "success") {
            console.log('Upload successful:', result.info);
            
            const newItem = {
                id: result.info.public_id,
                publicId: result.info.public_id,
                url: result.info.secure_url,
                thumbnail: this.generateThumbnail(result.info.public_id),
                title: result.info.display_name || result.info.original_filename || 'New Item',
                description: '',
                alt: '',
                isActive: true,
                order: this.state.items.length,
                width: result.info.width,
                height: result.info.height,
                size: result.info.bytes,
                format: result.info.format,
                folder: result.info.folder,
                createdAt: result.info.created_at,
                updatedAt: new Date().toISOString(),
                tags: ['carousel']
            };

            this.state.items.push(newItem);
            await this.saveItemToStorage(newItem);
            this.renderCarouselItems();
            this.updateStats();
            this.updatePreview();
            
            this.showNotification('success', `Image "${newItem.title}" uploaded successfully!`);
        }
    }

    generateThumbnail(publicId) {
        return `https://res.cloudinary.com/${this.config.cloudName}/image/upload/w_200,h_150,c_fill/${publicId}`;
    }

    async loadCarouselItems() {
        try {
            // Load from localStorage first
            const stored = localStorage.getItem('carouselItems');
            if (stored) {
                this.state.items = JSON.parse(stored);
            }
            
            // Try to load from API if available
            try {
                const response = await fetch(`${this.config.apiBase}/images`);
                if (response.ok) {
                    const apiItems = await response.json();
                    if (apiItems && apiItems.length > 0) {
                        this.state.items = apiItems;
                        localStorage.setItem('carouselItems', JSON.stringify(apiItems));
                    }
                }
            } catch (apiError) {
                console.log('API not available, using localStorage');
            }
            
            this.renderCarouselItems();
            this.updateStats();
            this.updatePreview();
            
        } catch (error) {
            console.error('Error loading carousel items:', error);
        }
    }

    async saveItemToStorage(item) {
        try {
            // Save to localStorage
            localStorage.setItem('carouselItems', JSON.stringify(this.state.items));
            
            // Try to save to API if available
            try {
                await fetch(`${this.config.apiBase}/images`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(item)
                });
            } catch (apiError) {
                console.log('API not available, saved to localStorage only');
            }
        } catch (error) {
            console.error('Error saving item:', error);
        }
    }

    renderCarouselItems() {
        const container = document.getElementById('carouselItemsList');
        if (!container) return;

        if (this.state.items.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12 text-gray-500">
                    <i class="fas fa-images text-4xl mb-4"></i>
                    <h3 class="text-xl font-semibold mb-2">No carousel items yet</h3>
                    <p class="mb-6">Start building your carousel by uploading images</p>
                    <button id="carouselAddFirst" class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">
                        <i class="fas fa-plus mr-2"></i>Add First Item
                    </button>
                </div>
            `;
            
            // Re-attach event listener
            document.getElementById('carouselAddFirst')?.addEventListener('click', () => this.openUploadWidget());
            return;
        }

        const sortedItems = [...this.state.items].sort((a, b) => a.order - b.order);
        
        container.innerHTML = sortedItems.map(item => `
            <div class="carousel-item bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-200 hover:border-blue-300 transition" data-id="${item.id}">
                <div class="flex items-center space-x-4">
                    <div class="flex-shrink-0">
                        <img src="${item.thumbnail}" alt="${item.alt || item.title}" 
                             class="w-20 h-15 object-cover rounded-lg border cursor-pointer"
                             onclick="adminCarousel.openImageModal('${item.id}')">
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between">
                            <h4 class="text-sm font-medium text-gray-900 truncate">${item.title}</h4>
                            <div class="flex items-center space-x-2">
                                <span class="text-xs px-2 py-1 rounded-full ${item.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                                    ${item.isActive ? 'Active' : 'Inactive'}
                                </span>
                                <span class="text-xs text-gray-500">${item.width}×${item.height}</span>
                            </div>
                        </div>
                        <p class="text-sm text-gray-500 mt-1">${item.description || 'No description'}</p>
                        <div class="flex items-center justify-between mt-2">
                            <div class="text-xs text-gray-400">
                                Order: ${item.order + 1} | Size: ${this.formatFileSize(item.size)}
                            </div>
                            <div class="flex space-x-1">
                                <button onclick="adminCarousel.editItem('${item.id}')" 
                                        class="p-1 text-blue-600 hover:text-blue-800 transition" title="Edit">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="adminCarousel.toggleActive('${item.id}')" 
                                        class="p-1 text-${item.isActive ? 'yellow' : 'green'}-600 hover:text-${item.isActive ? 'yellow' : 'green'}-800 transition" 
                                        title="${item.isActive ? 'Deactivate' : 'Activate'}">
                                    <i class="fas fa-${item.isActive ? 'pause' : 'play'}"></i>
                                </button>
                                <button onclick="adminCarousel.deleteItem('${item.id}')" 
                                        class="p-1 text-red-600 hover:text-red-800 transition" title="Delete">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="flex-shrink-0">
                        <i class="fas fa-grip-vertical text-gray-400 cursor-move"></i>
                    </div>
                </div>
            </div>
        `).join('');
    }

    updateStats() {
        const totalImages = this.state.items.length;
        const activeImages = this.state.items.filter(item => item.isActive).length;
        const totalSize = this.state.items.reduce((sum, item) => sum + (item.size || 0), 0);
        
        document.getElementById('carouselTotalImages').textContent = totalImages;
        document.getElementById('carouselActiveImages').textContent = activeImages;
        document.getElementById('carouselStorageUsed').textContent = this.formatFileSize(totalSize);
        
        // Update dashboard metric
        document.getElementById('totalCarouselImages').textContent = totalImages;
    }

    updatePreview() {
        const activeItems = this.state.items.filter(item => item.isActive);
        const previewContainer = document.getElementById('carouselLivePreview');
        
        if (!previewContainer) return;
        
        if (activeItems.length === 0) {
            previewContainer.innerHTML = '<p class="text-gray-500">No active items for preview</p>';
            return;
        }
        
        const currentItem = activeItems[this.state.currentPreviewIndex] || activeItems[0];
        previewContainer.innerHTML = `
            <div class="relative">
                <img src="${currentItem.url}" alt="${currentItem.alt || currentItem.title}" 
                     class="max-w-full max-h-64 mx-auto rounded-lg shadow-lg">
                <div class="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent rounded-b-lg">
                    <h3 class="text-white text-lg font-bold">${currentItem.title}</h3>
                    <p class="text-white/80 text-sm">${currentItem.description || 'No description'}</p>
                </div>
            </div>
        `;
    }

    async syncToHomepage() {
        try {
            const activeItems = this.state.items.filter(item => item.isActive);
            
            // Save to localStorage for homepage to read
            localStorage.setItem('homepageCarouselData', JSON.stringify(activeItems));
            
            // Dispatch event to notify homepage
            window.dispatchEvent(new CustomEvent('carouselDataUpdated', {
                detail: { items: activeItems }
            }));
            
            this.showNotification('success', `Synced ${activeItems.length} active items to homepage!`);
            
            // Open homepage in new tab to show changes
            window.open('/', '_blank');
            
        } catch (error) {
            console.error('Error syncing to homepage:', error);
            this.showNotification('error', 'Failed to sync to homepage');
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    showNotification(type, message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
            type === 'success' ? 'bg-green-500' : 
            type === 'error' ? 'bg-red-500' : 'bg-blue-500'
        } text-white`;
        
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
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    // Additional methods for item management
    async editItem(itemId) {
        const item = this.state.items.find(i => i.id === itemId);
        if (!item) return;
        
        const newTitle = prompt('Enter new title:', item.title);
        const newDescription = prompt('Enter new description:', item.description);
        
        if (newTitle !== null) {
            item.title = newTitle;
            item.description = newDescription || '';
            item.updatedAt = new Date().toISOString();
            
            await this.saveItemToStorage(item);
            this.renderCarouselItems();
            this.updatePreview();
            
            this.showNotification('success', 'Item updated successfully!');
        }
    }

    async toggleActive(itemId) {
        const item = this.state.items.find(i => i.id === itemId);
        if (!item) return;
        
        item.isActive = !item.isActive;
        item.updatedAt = new Date().toISOString();
        
        await this.saveItemToStorage(item);
        this.renderCarouselItems();
        this.updateStats();
        this.updatePreview();
        
        this.showNotification('success', `Item ${item.isActive ? 'activated' : 'deactivated'}!`);
    }

    async deleteItem(itemId) {
        if (!confirm('Are you sure you want to delete this item?')) return;
        
        this.state.items = this.state.items.filter(i => i.id !== itemId);
        
        localStorage.setItem('carouselItems', JSON.stringify(this.state.items));
        
        this.renderCarouselItems();
        this.updateStats();
        this.updatePreview();
        
        this.showNotification('success', 'Item deleted successfully!');
    }

    previewPrevious() {
        const activeItems = this.state.items.filter(item => item.isActive);
        if (activeItems.length === 0) return;
        
        this.state.currentPreviewIndex = (this.state.currentPreviewIndex - 1 + activeItems.length) % activeItems.length;
        this.updatePreview();
    }

    previewNext() {
        const activeItems = this.state.items.filter(item => item.isActive);
        if (activeItems.length === 0) return;
        
        this.state.currentPreviewIndex = (this.state.currentPreviewIndex + 1) % activeItems.length;
        this.updatePreview();
    }

    toggleAutoplay() {
        const button = document.getElementById('carouselAutoplay');
        
        if (this.state.isAutoplay) {
            clearInterval(this.state.autoplayInterval);
            this.state.isAutoplay = false;
            button.innerHTML = '<i class="fas fa-play mr-1"></i>Auto Play';
            button.className = button.className.replace('bg-red-600 hover:bg-red-700', 'bg-blue-600 hover:bg-blue-700');
        } else {
            this.state.autoplayInterval = setInterval(() => this.previewNext(), 3000);
            this.state.isAutoplay = true;
            button.innerHTML = '<i class="fas fa-pause mr-1"></i>Stop';
            button.className = button.className.replace('bg-blue-600 hover:bg-blue-700', 'bg-red-600 hover:bg-red-700');
        }
    }
}

// Initialize when DOM is ready
let adminCarousel;
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize if we're on the admin dashboard
    if (document.getElementById('carouselView')) {
        adminCarousel = new AdminCarouselManager();
        window.adminCarousel = adminCarousel; // Make globally available
    }
});
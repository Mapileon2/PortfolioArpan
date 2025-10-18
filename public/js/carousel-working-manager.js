/**
 * Working Carousel Management System
 * Simplified, functional version with all features working
 */

class WorkingCarouselManager {
    constructor() {
        this.config = {
            cloudName: 'dgymjtqil',
            uploadPreset: 'Carousel',
            folder: 'carou',
            apiBase: '/api/carousel'
        };
        
        this.state = {
            items: [],
            currentPreviewIndex: 0,
            autoplayInterval: null
        };
        
        this.uploadWidget = null;
        this.init();
    }

    async init() {
        console.log('🎠 Initializing Working Carousel Manager...');
        
        try {
            await this.loadCloudinarySDK();
            this.initializeUploadWidget();
            await this.loadCarouselItems();
            this.updateAnalytics();
            this.renderItems();
            this.renderPreview();
            
            console.log('✅ Carousel Manager ready!');
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            this.showNotification('error', 'Failed to initialize carousel manager');
        }
    }

    async loadCloudinarySDK() {
        if (window.cloudinary) return;
        
        return new Promise((resolve, reject) => {
            // Check if script already exists
            if (document.querySelector('script[src*="cloudinary"]')) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://upload-widget.cloudinary.com/global/all.js';
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load Cloudinary SDK'));
            document.head.appendChild(script);
        });
    }

    initializeUploadWidget() {
        this.uploadWidget = window.cloudinary.createUploadWidget({
            cloudName: this.config.cloudName,
            uploadPreset: this.config.uploadPreset,
            folder: this.config.folder,
            multiple: true,
            maxFiles: 10,
            sources: ['local', 'url', 'camera'],
            clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp']
        }, (error, result) => this.handleUploadResult(error, result));
        
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
            
            const newItem = {
                id: result.info.public_id,
                publicId: result.info.public_id,
                url: result.info.secure_url,
                thumbnail: this.generateThumbnail(result.info.public_id),
                title: result.info.display_name || result.info.original_filename || 'New Item',
                description: '',
                isActive: true,
                order: this.state.items.length,
                width: result.info.width,
                height: result.info.height,
                size: result.info.bytes,
                format: result.info.format,
                folder: result.info.folder,
                createdAt: result.info.created_at
            };

            this.state.items.push(newItem);
            this.saveItemToDatabase(newItem);
            this.updateAnalytics();
            this.renderItems();
            this.renderPreview();
            
            this.showNotification('success', `Image "${newItem.title}" uploaded successfully!`);
        }
    }

    async saveItemToDatabase(item) {
        try {
            const response = await fetch(`${this.config.apiBase}/images`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    publicId: item.publicId,
                    url: item.url,
                    thumbnail: item.thumbnail,
                    title: item.title,
                    description: item.description,
                    isActive: item.isActive,
                    order: item.order,
                    width: item.width,
                    height: item.height,
                    size: item.size,
                    format: item.format,
                    folder: item.folder
                })
            });

            if (response.ok) {
                console.log('✅ Item saved to database');
            } else {
                console.warn('⚠️ Database save failed, but upload succeeded');
            }
        } catch (error) {
            console.error('❌ Failed to save item:', error);
        }
    }

    async loadCarouselItems() {
        try {
            const response = await fetch(`${this.config.apiBase}/images`);
            
            if (response.ok) {
                const result = await response.json();
                this.state.items = (result.data || result || []).map(item => ({
                    id: item.id || item.public_id,
                    publicId: item.public_id || item.publicId,
                    url: item.secure_url || item.url,
                    thumbnail: item.thumbnail || this.generateThumbnail(item.public_id || item.publicId),
                    title: item.title || 'Carousel Image',
                    description: item.description || '',
                    isActive: item.is_active !== false,
                    order: item.order_index || item.order || 0,
                    width: item.width || 0,
                    height: item.height || 0,
                    size: item.bytes || item.size || 0,
                    format: item.format || 'jpg',
                    folder: item.folder || this.config.folder,
                    createdAt: item.created_at || item.createdAt
                }));
                
                console.log(`✅ Loaded ${this.state.items.length} carousel items`);
            } else {
                console.warn('⚠️ Failed to load items from API, using empty array');
                this.state.items = [];
            }
        } catch (error) {
            console.error('❌ Failed to load carousel items:', error);
            this.state.items = [];
        }
    }

    renderItems() {
        const container = document.getElementById('carouselItems');
        const emptyState = document.getElementById('emptyState');
        
        if (this.state.items.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        
        const sortedItems = [...this.state.items].sort((a, b) => a.order - b.order);
        
        container.innerHTML = sortedItems.map(item => `
            <div class="bg-gray-50 rounded-lg p-4 border hover:border-blue-200 transition-all">
                <div class="flex items-start space-x-4">
                    <img src="${item.thumbnail}" alt="${item.title}" 
                         class="w-20 h-20 object-cover rounded-lg border cursor-pointer"
                         onclick="carouselManager.previewItem('${item.id}')">
                    
                    <div class="flex-1 min-w-0">
                        <h4 class="text-lg font-semibold text-gray-900 truncate">${item.title}</h4>
                        <p class="text-sm text-gray-600 mt-1">${item.description || 'No description'}</p>
                        
                        <div class="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span><i class="fas fa-folder mr-1"></i>${item.folder}</span>
                            <span><i class="fas fa-file mr-1"></i>${(item.size / 1024 / 1024).toFixed(2)} MB</span>
                            <span><i class="fas fa-calendar mr-1"></i>${new Date(item.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                    
                    <div class="flex flex-col items-end space-y-2">
                        <label class="flex items-center cursor-pointer">
                            <input type="checkbox" ${item.isActive ? 'checked' : ''} 
                                   onchange="carouselManager.toggleItemStatus('${item.id}')"
                                   class="sr-only">
                            <div class="relative">
                                <div class="w-10 h-6 bg-gray-200 rounded-full shadow-inner transition-colors ${item.isActive ? 'bg-green-400' : ''}"></div>
                                <div class="absolute w-4 h-4 bg-white rounded-full shadow top-1 left-1 transition-transform ${item.isActive ? 'transform translate-x-4' : ''}"></div>
                            </div>
                            <span class="ml-2 text-xs ${item.isActive ? 'text-green-600' : 'text-gray-500'}">${item.isActive ? 'Active' : 'Inactive'}</span>
                        </label>
                        
                        <div class="flex space-x-1">
                            <button onclick="carouselManager.editItem('${item.id}')" 
                                    class="p-1 text-blue-600 hover:text-blue-800 transition" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="carouselManager.deleteItem('${item.id}')" 
                                    class="p-1 text-red-600 hover:text-red-800 transition" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                        
                        <div class="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                            ${item.order + 1}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderPreview() {
        const container = document.getElementById('carouselPreview');
        const activeItems = this.state.items.filter(item => item.isActive).sort((a, b) => a.order - b.order);
        
        if (activeItems.length === 0) {
            container.innerHTML = `
                <div class="h-48 flex items-center justify-center text-gray-500">
                    <div class="text-center">
                        <i class="fas fa-images text-4xl mb-4"></i>
                        <p>No active items for preview</p>
                    </div>
                </div>
            `;
            return;
        }

        const currentItem = activeItems[this.state.currentPreviewIndex] || activeItems[0];
        
        container.innerHTML = `
            <div class="relative h-48 bg-black rounded-lg overflow-hidden">
                <img src="${currentItem.url}" alt="${currentItem.title}" 
                     class="w-full h-full object-cover">
                <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
                    <h3 class="text-white text-lg font-semibold">${currentItem.title}</h3>
                    <p class="text-white text-sm opacity-90">${currentItem.description}</p>
                </div>
                <div class="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                    ${this.state.currentPreviewIndex + 1} / ${activeItems.length}
                </div>
            </div>
        `;
    }

    updateAnalytics() {
        const totalImages = this.state.items.length;
        const activeImages = this.state.items.filter(item => item.isActive).length;
        const totalSize = this.state.items.reduce((sum, item) => sum + (item.size || 0), 0);
        
        document.getElementById('totalImages').textContent = totalImages;
        document.getElementById('activeImages').textContent = activeImages;
        document.getElementById('storageUsed').textContent = `${(totalSize / 1024 / 1024).toFixed(1)} MB`;
        document.getElementById('systemStatus').textContent = totalImages > 0 ? 'Active' : 'Ready';
    }

    // Public Methods
    openUpload() {
        if (this.uploadWidget) {
            this.uploadWidget.open();
        } else {
            this.showNotification('error', 'Upload widget not ready');
        }
    }

    toggleItemStatus(itemId) {
        const item = this.state.items.find(i => i.id === itemId);
        if (item) {
            item.isActive = !item.isActive;
            this.updateItemInDatabase(item);
            this.updateAnalytics();
            this.renderItems();
            this.renderPreview();
        }
    }

    async deleteItem(itemId) {
        if (!confirm('Are you sure you want to delete this item?')) return;

        try {
            const item = this.state.items.find(i => i.id === itemId);
            if (item) {
                // Delete from Cloudinary
                await fetch('/api/cloudinary/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ publicId: item.publicId })
                });

                // Delete from database
                await fetch(`${this.config.apiBase}/images/${itemId}`, {
                    method: 'DELETE'
                });
            }

            this.state.items = this.state.items.filter(i => i.id !== itemId);
            this.updateAnalytics();
            this.renderItems();
            this.renderPreview();
            this.showNotification('success', 'Item deleted successfully');
        } catch (error) {
            console.error('❌ Delete failed:', error);
            this.showNotification('error', 'Failed to delete item');
        }
    }

    editItem(itemId) {
        const item = this.state.items.find(i => i.id === itemId);
        if (!item) return;

        const newTitle = prompt('Enter new title:', item.title);
        if (newTitle && newTitle !== item.title) {
            item.title = newTitle;
            this.updateItemInDatabase(item);
            this.renderItems();
            this.renderPreview();
            this.showNotification('success', 'Item updated successfully');
        }
    }

    previewItem(itemId) {
        const item = this.state.items.find(i => i.id === itemId);
        if (item) {
            const activeItems = this.state.items.filter(i => i.isActive);
            const index = activeItems.findIndex(i => i.id === itemId);
            if (index >= 0) {
                this.state.currentPreviewIndex = index;
                this.renderPreview();
            }
        }
    }

    previewNext() {
        const activeItems = this.state.items.filter(item => item.isActive);
        if (activeItems.length > 0) {
            this.state.currentPreviewIndex = (this.state.currentPreviewIndex + 1) % activeItems.length;
            this.renderPreview();
        }
    }

    previewPrevious() {
        const activeItems = this.state.items.filter(item => item.isActive);
        if (activeItems.length > 0) {
            this.state.currentPreviewIndex = this.state.currentPreviewIndex === 0 
                ? activeItems.length - 1 
                : this.state.currentPreviewIndex - 1;
            this.renderPreview();
        }
    }

    toggleAutoplay() {
        const btn = document.getElementById('autoplayBtn');
        
        if (this.state.autoplayInterval) {
            clearInterval(this.state.autoplayInterval);
            this.state.autoplayInterval = null;
            btn.innerHTML = '<i class="fas fa-play mr-1"></i>Auto Play';
            btn.className = btn.className.replace('bg-red-600', 'bg-blue-600').replace('hover:bg-red-700', 'hover:bg-blue-700');
        } else {
            this.state.autoplayInterval = setInterval(() => {
                this.previewNext();
            }, 3000);
            btn.innerHTML = '<i class="fas fa-stop mr-1"></i>Stop';
            btn.className = btn.className.replace('bg-blue-600', 'bg-red-600').replace('hover:bg-blue-700', 'hover:bg-red-700');
        }
    }

    async saveOrder() {
        try {
            const orderData = this.state.items.map((item, index) => ({
                id: item.id,
                order: index
            }));

            const response = await fetch(`${this.config.apiBase}/order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: orderData })
            });

            if (response.ok) {
                this.showNotification('success', 'Order saved successfully');
            } else {
                throw new Error('Failed to save order');
            }
        } catch (error) {
            console.error('❌ Save order failed:', error);
            this.showNotification('error', 'Failed to save order');
        }
    }

    exportData() {
        try {
            const exportData = {
                metadata: {
                    exportDate: new Date().toISOString(),
                    totalItems: this.state.items.length,
                    activeItems: this.state.items.filter(i => i.isActive).length
                },
                items: this.state.items
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `carousel-export-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);

            this.showNotification('success', 'Data exported successfully');
        } catch (error) {
            console.error('❌ Export failed:', error);
            this.showNotification('error', 'Export failed');
        }
    }

    async syncToHomepage() {
        try {
            const activeItems = this.state.items
                .filter(item => item.isActive)
                .sort((a, b) => a.order - b.order);

            // Save to localStorage for homepage to use
            localStorage.setItem('carouselSlides', JSON.stringify(activeItems.map(item => ({
                id: item.id,
                title: item.title,
                description: item.description,
                image_url: item.url,
                is_active: item.isActive,
                order_index: item.order
            }))));

            // Trigger homepage carousel update if it exists
            if (window.frontCarousel && typeof window.frontCarousel.refresh === 'function') {
                window.frontCarousel.refresh();
            }

            // Dispatch custom event for homepage to listen
            window.dispatchEvent(new CustomEvent('carouselSlidesUpdated', {
                detail: { slides: activeItems }
            }));

            this.showNotification('success', `Synced ${activeItems.length} active slides to homepage`);
        } catch (error) {
            console.error('❌ Sync failed:', error);
            this.showNotification('error', 'Failed to sync to homepage');
        }
    }

    // Utility Methods
    generateThumbnail(publicId) {
        return `https://res.cloudinary.com/${this.config.cloudName}/image/upload/w_300,h_200,c_fill,q_auto/${publicId}`;
    }

    async updateItemInDatabase(item) {
        try {
            const response = await fetch(`${this.config.apiBase}/images/${item.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: item.title,
                    description: item.description,
                    isActive: item.isActive,
                    order: item.order
                })
            });

            if (!response.ok) {
                console.warn('⚠️ Database update failed');
            }
        } catch (error) {
            console.error('❌ Update failed:', error);
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

// Initialize the working carousel manager
document.addEventListener('DOMContentLoaded', () => {
    window.carouselManager = new WorkingCarouselManager();
});
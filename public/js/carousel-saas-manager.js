/**
 * Enterprise Carousel Management System
 * SaaS-grade carousel content management with advanced features
 */

class CarouselSaaSManager {
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
            currentView: 'grid',
            currentPreviewIndex: 0,
            autoplayInterval: null,
            filters: {
                search: '',
                status: '',
                sortBy: 'order'
            },
            performance: {
                loadTime: 0,
                optimization: 0,
                seoScore: 0
            }
        };
        
        this.sortable = null;
        this.uploadWidget = null;
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Enterprise Carousel Management...');
        
        try {
            await this.loadCloudinarySDK();
            this.initializeUploadWidget();
            this.setupEventListeners();
            await this.loadCarouselItems();
            this.initializeSortable();
            this.startPerformanceMonitoring();
            
            console.log('✅ Carousel SaaS Manager ready');
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            this.showNotification('error', 'Failed to initialize carousel manager');
        }
    }

    async loadCloudinarySDK() {
        if (window.cloudinary) return;
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://upload-widget.cloudinary.com/global/all.js';
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load Cloudinary SDK'));
            if (!document.head.querySelector('script[src*="cloudinary"]')) {
                document.head.appendChild(script);
            } else {
                resolve();
            }
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
        // Search and filter listeners
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.state.filters.search = e.target.value;
            this.debounce(() => this.filterAndRender(), 300)();
        });

        document.getElementById('statusFilter').addEventListener('change', (e) => {
            this.state.filters.status = e.target.value;
            this.filterAndRender();
        });

        document.getElementById('sortBy').addEventListener('change', (e) => {
            this.state.filters.sortBy = e.target.value;
            this.filterAndRender();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'a':
                        e.preventDefault();
                        this.selectAll();
                        break;
                    case 's':
                        e.preventDefault();
                        this.saveOrder();
                        break;
                    case 'u':
                        e.preventDefault();
                        this.bulkUpload();
                        break;
                }
            }
        });
    }

    async loadCarouselItems() {
        try {
            this.showLoading(true);
            const startTime = performance.now();
            
            const response = await fetch(`${this.config.apiBase}/images`);
            const result = await response.json();
            
            this.state.items = (result.data || result || []).map(item => ({
                id: item.id || item.public_id,
                publicId: item.public_id || item.publicId,
                url: item.secure_url || item.url,
                thumbnail: item.thumbnail || this.generateThumbnail(item.public_id || item.publicId),
                title: item.title || 'Untitled',
                description: item.description || '',
                alt: item.alt_text || item.alt || '',
                isActive: item.is_active !== false,
                order: item.order_index || item.order || 0,
                width: item.width || 0,
                height: item.height || 0,
                size: item.bytes || item.size || 0,
                format: item.format || 'jpg',
                folder: item.folder || this.config.folder,
                createdAt: item.created_at || item.createdAt,
                updatedAt: item.updated_at || item.updatedAt,
                // SaaS-specific fields
                clicks: item.clicks || 0,
                impressions: item.impressions || 0,
                ctr: item.ctr || 0,
                scheduledStart: item.scheduled_start,
                scheduledEnd: item.scheduled_end,
                tags: item.tags || [],
                metadata: item.metadata || {}
            }));

            const loadTime = performance.now() - startTime;
            this.state.performance.loadTime = Math.round(loadTime);
            
            this.updateAnalytics();
            this.renderCarouselItems();
            this.renderPreview();
            this.calculatePerformanceMetrics();
            
            console.log(`✅ Loaded ${this.state.items.length} carousel items in ${loadTime}ms`);
        } catch (error) {
            console.error('❌ Failed to load carousel items:', error);
            this.showNotification('error', 'Failed to load carousel items');
        } finally {
            this.showLoading(false);
        }
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
                clicks: 0,
                impressions: 0,
                ctr: 0,
                tags: ['carousel'],
                metadata: {}
            };

            this.state.items.push(newItem);
            this.saveItemToDatabase(newItem);
            this.updateAnalytics();
            this.renderCarouselItems();
            this.renderPreview();
            this.autoSyncToHomepage();
            
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
                    alt: item.alt,
                    isActive: item.isActive,
                    order: item.order,
                    width: item.width,
                    height: item.height,
                    size: item.size,
                    format: item.format,
                    folder: item.folder,
                    tags: item.tags,
                    metadata: item.metadata
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            console.log('✅ Item saved to database');
        } catch (error) {
            console.error('❌ Failed to save item:', error);
            this.showNotification('warning', 'Item uploaded but database save failed');
        }
    }

    renderCarouselItems() {
        const container = document.getElementById('carouselItems');
        const emptyState = document.getElementById('emptyState');
        
        if (this.state.items.length === 0) {
            container.classList.add('hidden');
            emptyState.classList.remove('hidden');
            return;
        }

        container.classList.remove('hidden');
        emptyState.classList.add('hidden');

        const filteredItems = this.getFilteredItems();
        
        container.innerHTML = filteredItems.map(item => `
            <div class="carousel-item bg-gray-50 rounded-lg p-4 border-2 border-transparent hover:border-blue-200 transition-all" 
                 data-id="${item.id}">
                <div class="flex items-start space-x-4">
                    <!-- Drag Handle -->
                    <div class="drag-handle flex-shrink-0 mt-2 text-gray-400 hover:text-gray-600 cursor-grab">
                        <i class="fas fa-grip-vertical"></i>
                    </div>
                    
                    <!-- Selection Checkbox -->
                    <div class="flex-shrink-0 mt-2">
                        <input type="checkbox" class="item-checkbox rounded" 
                               data-id="${item.id}" 
                               ${this.state.selectedItems.has(item.id) ? 'checked' : ''}
                               onchange="carouselSaaS.toggleSelection('${item.id}')">
                    </div>
                    
                    <!-- Image Thumbnail -->
                    <div class="flex-shrink-0">
                        <img src="${item.thumbnail}" alt="${item.alt || item.title}" 
                             class="w-20 h-20 object-cover rounded-lg border cursor-pointer"
                             onclick="carouselSaaS.openImageModal('${item.id}')">
                        <div class="text-xs text-center mt-1 text-gray-500">
                            ${item.width}×${item.height}
                        </div>
                    </div>
                    
                    <!-- Item Details -->
                    <div class="flex-1 min-w-0">
                        <div class="flex items-start justify-between">
                            <div class="flex-1">
                                <h4 class="text-lg font-semibold text-gray-900 truncate">${item.title}</h4>
                                <p class="text-sm text-gray-600 mt-1 line-clamp-2">${item.description || 'No description'}</p>
                                
                                <!-- Metadata -->
                                <div class="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                    <span><i class="fas fa-folder mr-1"></i>${item.folder}</span>
                                    <span><i class="fas fa-file mr-1"></i>${(item.size / 1024 / 1024).toFixed(2)} MB</span>
                                    <span><i class="fas fa-calendar mr-1"></i>${new Date(item.createdAt).toLocaleDateString()}</span>
                                </div>
                                
                                <!-- Performance Metrics -->
                                <div class="flex items-center space-x-4 mt-2 text-xs">
                                    <span class="text-blue-600"><i class="fas fa-eye mr-1"></i>${item.impressions} views</span>
                                    <span class="text-green-600"><i class="fas fa-mouse-pointer mr-1"></i>${item.clicks} clicks</span>
                                    <span class="text-purple-600"><i class="fas fa-percentage mr-1"></i>${(item.ctr * 100).toFixed(1)}% CTR</span>
                                </div>
                                
                                <!-- Tags -->
                                <div class="flex flex-wrap gap-1 mt-2">
                                    ${item.tags.map(tag => `
                                        <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">${tag}</span>
                                    `).join('')}
                                </div>
                            </div>
                            
                            <!-- Status & Actions -->
                            <div class="flex flex-col items-end space-y-2 ml-4">
                                <!-- Status Toggle -->
                                <label class="flex items-center cursor-pointer">
                                    <input type="checkbox" ${item.isActive ? 'checked' : ''} 
                                           onchange="carouselSaaS.toggleItemStatus('${item.id}')"
                                           class="sr-only">
                                    <div class="relative">
                                        <div class="w-10 h-6 bg-gray-200 rounded-full shadow-inner transition-colors ${item.isActive ? 'bg-green-400' : ''}"></div>
                                        <div class="absolute w-4 h-4 bg-white rounded-full shadow top-1 left-1 transition-transform ${item.isActive ? 'transform translate-x-4' : ''}"></div>
                                    </div>
                                    <span class="ml-2 text-xs ${item.isActive ? 'text-green-600' : 'text-gray-500'}">${item.isActive ? 'Active' : 'Inactive'}</span>
                                </label>
                                
                                <!-- Action Buttons -->
                                <div class="flex space-x-1">
                                    <button onclick="carouselSaaS.editItem('${item.id}')" 
                                            class="p-1 text-blue-600 hover:text-blue-800 transition" title="Edit">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button onclick="carouselSaaS.duplicateItem('${item.id}')" 
                                            class="p-1 text-green-600 hover:text-green-800 transition" title="Duplicate">
                                        <i class="fas fa-copy"></i>
                                    </button>
                                    <button onclick="carouselSaaS.scheduleItem('${item.id}')" 
                                            class="p-1 text-purple-600 hover:text-purple-800 transition" title="Schedule">
                                        <i class="fas fa-calendar"></i>
                                    </button>
                                    <button onclick="carouselSaaS.deleteItem('${item.id}')" 
                                            class="p-1 text-red-600 hover:text-red-800 transition" title="Delete">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                                
                                <!-- Order Badge -->
                                <div class="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                                    ${item.order + 1}
                                </div>
                            </div>
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
                <img src="${currentItem.url}" alt="${currentItem.alt || currentItem.title}" 
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
        
        // Update performance score
        const performanceScore = this.calculatePerformanceScore();
        document.getElementById('performanceScore').textContent = `${performanceScore}/100`;
    }

    calculatePerformanceScore() {
        let score = 100;
        
        // Deduct points for large images
        const avgSize = this.state.items.reduce((sum, item) => sum + (item.size || 0), 0) / this.state.items.length;
        if (avgSize > 2 * 1024 * 1024) score -= 20; // > 2MB
        
        // Deduct points for missing alt text
        const missingAlt = this.state.items.filter(item => !item.alt).length;
        score -= (missingAlt / this.state.items.length) * 30;
        
        // Deduct points for too many items
        if (this.state.items.length > 10) score -= 10;
        
        return Math.max(0, Math.round(score));
    }

    calculatePerformanceMetrics() {
        // Simulate performance calculations
        setTimeout(() => {
            document.getElementById('loadTime').textContent = `${this.state.performance.loadTime}ms`;
            document.getElementById('optimization').textContent = `${Math.round(Math.random() * 30 + 70)}%`;
            document.getElementById('seoScore').textContent = `${this.calculatePerformanceScore()}/100`;
        }, 1000);
    }

    // SaaS Management Methods
    bulkUpload() {
        if (this.uploadWidget) {
            this.uploadWidget.open();
        } else {
            this.showNotification('error', 'Upload widget not ready');
        }
    }

    addNewItem() {
        this.bulkUpload();
    }

    editItem(itemId) {
        const item = this.state.items.find(i => i.id === itemId);
        if (!item) return;

        this.showEditModal(item);
    }

    async duplicateItem(itemId) {
        const item = this.state.items.find(i => i.id === itemId);
        if (!item) return;

        const duplicatedItem = {
            ...item,
            id: `${item.id}_copy_${Date.now()}`,
            publicId: `${item.publicId}_copy_${Date.now()}`,
            title: `${item.title} (Copy)`,
            order: this.state.items.length,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.state.items.push(duplicatedItem);
        await this.saveItemToDatabase(duplicatedItem);
        this.updateAnalytics();
        this.renderCarouselItems();
        this.showNotification('success', 'Item duplicated successfully');
    }

    scheduleItem(itemId) {
        const item = this.state.items.find(i => i.id === itemId);
        if (!item) return;

        this.showScheduleModal(item);
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
            this.state.selectedItems.delete(itemId);
            this.updateAnalytics();
            this.renderCarouselItems();
            this.renderPreview();
            this.autoSyncToHomepage();
            this.showNotification('success', 'Item deleted successfully');
        } catch (error) {
            console.error('❌ Delete failed:', error);
            this.showNotification('error', 'Failed to delete item');
        }
    }

    toggleItemStatus(itemId) {
        const item = this.state.items.find(i => i.id === itemId);
        if (item) {
            item.isActive = !item.isActive;
            this.updateItemInDatabase(item);
            this.updateAnalytics();
            this.renderPreview();
        }
    }

    toggleSelection(itemId) {
        if (this.state.selectedItems.has(itemId)) {
            this.state.selectedItems.delete(itemId);
        } else {
            this.state.selectedItems.add(itemId);
        }
        this.updateBulkActionsBar();
    }

    selectAll() {
        const filteredItems = this.getFilteredItems();
        filteredItems.forEach(item => this.state.selectedItems.add(item.id));
        this.renderCarouselItems();
        this.updateBulkActionsBar();
    }

    clearSelection() {
        this.state.selectedItems.clear();
        this.renderCarouselItems();
        this.updateBulkActionsBar();
    }

    updateBulkActionsBar() {
        const bar = document.getElementById('bulkActionsBar');
        const count = document.getElementById('selectedCount');
        
        if (this.state.selectedItems.size > 0) {
            bar.classList.remove('hidden');
            count.textContent = `${this.state.selectedItems.size} items selected`;
        } else {
            bar.classList.add('hidden');
        }
    }

    async bulkActivate() {
        const selectedIds = Array.from(this.state.selectedItems);
        for (const id of selectedIds) {
            const item = this.state.items.find(i => i.id === id);
            if (item) {
                item.isActive = true;
                await this.updateItemInDatabase(item);
            }
        }
        this.updateAnalytics();
        this.renderCarouselItems();
        this.renderPreview();
        this.showNotification('success', `${selectedIds.length} items activated`);
    }

    async bulkDeactivate() {
        const selectedIds = Array.from(this.state.selectedItems);
        for (const id of selectedIds) {
            const item = this.state.items.find(i => i.id === id);
            if (item) {
                item.isActive = false;
                await this.updateItemInDatabase(item);
            }
        }
        this.updateAnalytics();
        this.renderCarouselItems();
        this.renderPreview();
        this.showNotification('success', `${selectedIds.length} items deactivated`);
    }

    async bulkDelete() {
        if (!confirm(`Delete ${this.state.selectedItems.size} selected items?`)) return;

        const selectedIds = Array.from(this.state.selectedItems);
        for (const id of selectedIds) {
            await this.deleteItem(id);
        }
        this.clearSelection();
    }

    // Preview Controls
    previewNext() {
        const activeItems = this.state.items.filter(item => item.isActive);
        this.state.currentPreviewIndex = (this.state.currentPreviewIndex + 1) % activeItems.length;
        this.renderPreview();
    }

    previewPrevious() {
        const activeItems = this.state.items.filter(item => item.isActive);
        this.state.currentPreviewIndex = this.state.currentPreviewIndex === 0 
            ? activeItems.length - 1 
            : this.state.currentPreviewIndex - 1;
        this.renderPreview();
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

    // Utility Methods
    getFilteredItems() {
        let filtered = [...this.state.items];

        // Apply search filter
        if (this.state.filters.search) {
            const search = this.state.filters.search.toLowerCase();
            filtered = filtered.filter(item => 
                item.title.toLowerCase().includes(search) ||
                item.description.toLowerCase().includes(search) ||
                item.tags.some(tag => tag.toLowerCase().includes(search))
            );
        }

        // Apply status filter
        if (this.state.filters.status) {
            filtered = filtered.filter(item => {
                switch (this.state.filters.status) {
                    case 'active': return item.isActive;
                    case 'inactive': return !item.isActive;
                    case 'scheduled': return item.scheduledStart || item.scheduledEnd;
                    default: return true;
                }
            });
        }

        // Apply sorting
        filtered.sort((a, b) => {
            switch (this.state.filters.sortBy) {
                case 'created': return new Date(b.createdAt) - new Date(a.createdAt);
                case 'title': return a.title.localeCompare(b.title);
                case 'size': return b.size - a.size;
                case 'order':
                default: return a.order - b.order;
            }
        });

        return filtered;
    }

    generateThumbnail(publicId) {
        return `https://res.cloudinary.com/${this.config.cloudName}/image/upload/w_300,h_200,c_fill,q_auto/${publicId}`;
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    filterAndRender() {
        this.renderCarouselItems();
    }

    showLoading(show) {
        // Implementation for loading state
        console.log(show ? 'Loading...' : 'Loading complete');
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

    // Advanced SaaS Features
    async exportData() {
        try {
            const exportData = {
                metadata: {
                    exportDate: new Date().toISOString(),
                    totalItems: this.state.items.length,
                    activeItems: this.state.items.filter(i => i.isActive).length,
                    version: '1.0'
                },
                items: this.state.items.map(item => ({
                    ...item,
                    // Remove sensitive data for export
                    publicId: undefined
                })),
                analytics: {
                    totalImpressions: this.state.items.reduce((sum, item) => sum + item.impressions, 0),
                    totalClicks: this.state.items.reduce((sum, item) => sum + item.clicks, 0),
                    averageCTR: this.state.items.reduce((sum, item) => sum + item.ctr, 0) / this.state.items.length,
                    performanceScore: this.calculatePerformanceScore()
                }
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

    async optimizeImages() {
        const unoptimizedItems = this.state.items.filter(item => item.size > 1024 * 1024); // > 1MB
        
        if (unoptimizedItems.length === 0) {
            this.showNotification('info', 'All images are already optimized');
            return;
        }

        if (!confirm(`Optimize ${unoptimizedItems.length} images? This will create new optimized versions.`)) {
            return;
        }

        try {
            for (const item of unoptimizedItems) {
                // Create optimized version using Cloudinary transformations
                const optimizedUrl = `https://res.cloudinary.com/${this.config.cloudName}/image/upload/q_auto:good,f_auto,w_1920,h_1080,c_fill/${item.publicId}`;
                
                // Update item with optimized URL
                item.url = optimizedUrl;
                item.metadata.optimized = true;
                item.metadata.originalSize = item.size;
                
                await this.updateItemInDatabase(item);
            }

            this.renderCarouselItems();
            this.calculatePerformanceMetrics();
            this.showNotification('success', `${unoptimizedItems.length} images optimized`);
        } catch (error) {
            console.error('❌ Optimization failed:', error);
            this.showNotification('error', 'Image optimization failed');
        }
    }

    async generateReport() {
        const report = {
            summary: {
                totalItems: this.state.items.length,
                activeItems: this.state.items.filter(i => i.isActive).length,
                totalStorage: this.state.items.reduce((sum, item) => sum + (item.size || 0), 0),
                averageSize: this.state.items.reduce((sum, item) => sum + (item.size || 0), 0) / this.state.items.length,
                performanceScore: this.calculatePerformanceScore()
            },
            analytics: {
                totalImpressions: this.state.items.reduce((sum, item) => sum + item.impressions, 0),
                totalClicks: this.state.items.reduce((sum, item) => sum + item.clicks, 0),
                averageCTR: this.state.items.reduce((sum, item) => sum + item.ctr, 0) / this.state.items.length,
                topPerforming: this.state.items
                    .sort((a, b) => b.ctr - a.ctr)
                    .slice(0, 5)
                    .map(item => ({ title: item.title, ctr: item.ctr, clicks: item.clicks }))
            },
            recommendations: this.generateRecommendations()
        };

        this.showReportModal(report);
    }

    generateRecommendations() {
        const recommendations = [];
        
        // Check for large images
        const largeImages = this.state.items.filter(item => item.size > 2 * 1024 * 1024);
        if (largeImages.length > 0) {
            recommendations.push({
                type: 'performance',
                priority: 'high',
                message: `${largeImages.length} images are larger than 2MB. Consider optimizing them.`,
                action: 'optimize'
            });
        }

        // Check for missing alt text
        const missingAlt = this.state.items.filter(item => !item.alt);
        if (missingAlt.length > 0) {
            recommendations.push({
                type: 'accessibility',
                priority: 'medium',
                message: `${missingAlt.length} images are missing alt text for accessibility.`,
                action: 'add_alt_text'
            });
        }

        // Check for inactive items
        const inactiveItems = this.state.items.filter(item => !item.isActive);
        if (inactiveItems.length > this.state.items.length * 0.3) {
            recommendations.push({
                type: 'content',
                priority: 'low',
                message: `${inactiveItems.length} items are inactive. Consider removing unused content.`,
                action: 'cleanup'
            });
        }

        return recommendations;
    }

    scheduleContent() {
        this.showScheduleModal();
    }

    openSettings() {
        this.showSettingsModal();
    }

    toggleView(view) {
        this.state.currentView = view;
        
        // Update button states
        document.getElementById('gridViewBtn').classList.toggle('text-blue-600', view === 'grid');
        document.getElementById('listViewBtn').classList.toggle('text-blue-600', view === 'list');
        
        // Re-render with new view
        this.renderCarouselItems();
    }

    initializeSortable() {
        const container = document.getElementById('carouselItems');
        this.sortable = Sortable.create(container, {
            handle: '.drag-handle',
            animation: 150,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            onEnd: (evt) => {
                const itemId = evt.item.dataset.id;
                const newIndex = evt.newIndex;
                
                // Update order in state
                const item = this.state.items.find(i => i.id === itemId);
                if (item) {
                    item.order = newIndex;
                    this.reorderItems();
                }
            }
        });
    }

    reorderItems() {
        // Reorder all items based on their new positions
        this.state.items.forEach((item, index) => {
            item.order = index;
        });
        
        this.renderCarouselItems();
        this.renderPreview();
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
                this.autoSyncToHomepage();
                this.showNotification('success', 'Order saved successfully');
            } else {
                throw new Error('Failed to save order');
            }
        } catch (error) {
            console.error('❌ Save order failed:', error);
            this.showNotification('error', 'Failed to save order');
        }
    }

    async updateItemInDatabase(item) {
        try {
            const response = await fetch(`${this.config.apiBase}/images/${item.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: item.title,
                    description: item.description,
                    alt: item.alt,
                    isActive: item.isActive,
                    order: item.order,
                    tags: item.tags,
                    metadata: item.metadata,
                    scheduledStart: item.scheduledStart,
                    scheduledEnd: item.scheduledEnd
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('❌ Update failed:', error);
        }
    }

    startPerformanceMonitoring() {
        // Monitor performance metrics every 30 seconds
        setInterval(() => {
            this.calculatePerformanceMetrics();
        }, 30000);
    }

    // Modal Methods (simplified implementations)
    showEditModal(item) {
        // Implementation for edit modal
        console.log('Edit modal for:', item.title);
    }

    showScheduleModal(item = null) {
        // Implementation for schedule modal
        console.log('Schedule modal for:', item ? item.title : 'new schedule');
    }

    showReportModal(report) {
        // Implementation for report modal
        console.log('Report modal:', report);
    }

    showSettingsModal() {
        // Implementation for settings modal
        console.log('Settings modal');
    }

    // Homepage Integration Methods
    syncToHomepage() {
        try {
            const activeItems = this.state.items.filter(item => item.isActive);
            const homepageData = activeItems.map(item => ({
                id: item.id,
                url: item.url,
                thumbnail: item.thumbnail,
                title: item.title,
                description: item.description,
                alt: item.alt,
                order: item.order
            }));

            // Save to localStorage for homepage consumption
            localStorage.setItem('homepageCarouselData', JSON.stringify(homepageData));
            localStorage.setItem('carouselLastSync', new Date().toISOString());

            // Dispatch custom event for real-time updates
            window.dispatchEvent(new CustomEvent('carouselDataUpdated', {
                detail: { items: homepageData, timestamp: new Date().toISOString() }
            }));

            this.showNotification('success', `Synced ${homepageData.length} items to homepage`);
            console.log('✅ Homepage sync completed:', homepageData.length, 'items');
            
            return homepageData;
        } catch (error) {
            console.error('❌ Homepage sync failed:', error);
            this.showNotification('error', 'Failed to sync to homepage');
            return null;
        }
    }

    autoSyncToHomepage() {
        // Auto-sync whenever items are modified
        if (this.config.autoSync !== false) {
            setTimeout(() => {
                this.syncToHomepage();
            }, 100); // Small delay to ensure state is updated
        }
    }

    openImageModal(itemId) {
        const item = this.state.items.find(i => i.id === itemId);
        if (!item) return;

        // Create image preview modal
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="relative max-w-4xl max-h-full p-4">
                <img src="${item.url}" alt="${item.alt || item.title}" class="max-w-full max-h-full object-contain">
                <button onclick="this.parentElement.parentElement.remove()" 
                        class="absolute top-2 right-2 bg-white text-black rounded-full w-10 h-10 flex items-center justify-center hover:bg-gray-200">
                    <i class="fas fa-times"></i>
                </button>
                <div class="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white p-3 rounded">
                    <div class="font-semibold">${item.title}</div>
                    <div class="text-sm text-gray-300">${item.width} × ${item.height} • ${(item.size / 1024 / 1024).toFixed(2)} MB</div>
                    <div class="text-sm text-blue-300">CTR: ${(item.ctr * 100).toFixed(1)}% • ${item.clicks} clicks</div>
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

// Initialize the SaaS manager
document.addEventListener('DOMContentLoaded', () => {
    window.carouselSaaS = new CarouselSaaSManager();
});
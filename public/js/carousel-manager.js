/**
 * Carousel Management System
 * Complete CRUD operations for carousel slides with Cloudinary integration
 * Connects admin panel to front page carousel
 */

class CarouselManager {
    constructor() {
        this.slides = [];
        this.currentSlideId = null;
        this.init();
    }

    async init() {
        console.log('🎠 Initializing Carousel Manager...');
        
        // Wait for services to load
        await this.waitForServices();
        
        // Load existing slides
        await this.loadSlides();
        
        // Setup event listeners
        this.setupEventListeners();
        
        console.log('✅ Carousel Manager ready!');
    }

    async waitForServices() {
        let attempts = 0;
        while ((!window.workingUploadService || !window.workingSupabaseClient) && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
    }

    setupEventListeners() {
        // Add slide button
        const addSlideBtn = document.getElementById('addCarouselSlide');
        if (addSlideBtn) {
            addSlideBtn.onclick = () => this.openSlideEditor();
        }

        // Refresh slides button
        const refreshBtn = document.getElementById('refreshCarouselSlides');
        if (refreshBtn) {
            refreshBtn.onclick = () => this.loadSlides();
        }
    }

    // ==================== CRUD OPERATIONS ====================

    async loadSlides() {
        try {
            this.showLoading(true);
            
            // Try to load from Supabase first
            if (window.workingSupabaseClient) {
                this.slides = await window.workingSupabaseClient.getCarouselSlides();
            } else {
                // Fallback to localStorage or mock data
                this.slides = this.getMockSlides();
            }

            this.renderSlides();
            this.updateSlideCount();
            
        } catch (error) {
            console.error('Failed to load carousel slides:', error);
            this.showNotification('error', 'Failed to load carousel slides');
            this.slides = this.getMockSlides();
            this.renderSlides();
        } finally {
            this.showLoading(false);
        }
    }

    async createSlide(slideData) {
        try {
            const newSlide = {
                id: Date.now().toString(),
                title: slideData.title,
                description: slideData.description,
                image_url: slideData.image_url,
                link_url: slideData.link_url || '',
                order_index: this.slides.length,
                is_active: slideData.is_active !== false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            if (window.workingSupabaseClient) {
                const savedSlide = await window.workingSupabaseClient.createCarouselSlide(newSlide);
                this.slides.push(savedSlide);
            } else {
                // Fallback to localStorage
                this.slides.push(newSlide);
                this.saveToLocalStorage();
            }

            this.renderSlides();
            this.updateSlideCount();
            this.showNotification('success', 'Slide created successfully');
            
            // Update front page carousel
            this.updateFrontPageCarousel();
            
            return newSlide;
        } catch (error) {
            console.error('Failed to create slide:', error);
            this.showNotification('error', 'Failed to create slide');
            throw error;
        }
    }

    async updateSlide(slideId, updateData) {
        try {
            const slideIndex = this.slides.findIndex(s => s.id === slideId);
            if (slideIndex === -1) throw new Error('Slide not found');

            const updatedSlide = {
                ...this.slides[slideIndex],
                ...updateData,
                updated_at: new Date().toISOString()
            };

            if (window.workingSupabaseClient) {
                await window.workingSupabaseClient.updateCarouselSlide(slideId, updatedSlide);
            } else {
                // Fallback to localStorage
                this.saveToLocalStorage();
            }

            this.slides[slideIndex] = updatedSlide;
            this.renderSlides();
            this.showNotification('success', 'Slide updated successfully');
            
            // Update front page carousel
            this.updateFrontPageCarousel();
            
            return updatedSlide;
        } catch (error) {
            console.error('Failed to update slide:', error);
            this.showNotification('error', 'Failed to update slide');
            throw error;
        }
    }

    async deleteSlide(slideId) {
        if (!confirm('Are you sure you want to delete this slide?')) return;

        try {
            if (window.workingSupabaseClient) {
                await window.workingSupabaseClient.deleteCarouselSlide(slideId);
            }

            this.slides = this.slides.filter(s => s.id !== slideId);
            this.saveToLocalStorage();
            this.renderSlides();
            this.updateSlideCount();
            this.showNotification('success', 'Slide deleted successfully');
            
            // Update front page carousel
            this.updateFrontPageCarousel();
            
        } catch (error) {
            console.error('Failed to delete slide:', error);
            this.showNotification('error', 'Failed to delete slide');
        }
    }

    async reorderSlides(newOrder) {
        try {
            // Update order_index for each slide
            const updatedSlides = newOrder.map((slideId, index) => {
                const slide = this.slides.find(s => s.id === slideId);
                return { ...slide, order_index: index };
            });

            if (window.workingSupabaseClient) {
                await Promise.all(
                    updatedSlides.map(slide => 
                        window.workingSupabaseClient.updateCarouselSlide(slide.id, { order_index: slide.order_index })
                    )
                );
            }

            this.slides = updatedSlides.sort((a, b) => a.order_index - b.order_index);
            this.saveToLocalStorage();
            this.renderSlides();
            this.showNotification('success', 'Slide order updated');
            
            // Update front page carousel
            this.updateFrontPageCarousel();
            
        } catch (error) {
            console.error('Failed to reorder slides:', error);
            this.showNotification('error', 'Failed to reorder slides');
        }
    }

    // ==================== UI RENDERING ====================

    renderSlides() {
        const container = document.getElementById('carouselSlides');
        if (!container) return;

        if (this.slides.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <i class="fas fa-images text-6xl text-gray-300 mb-4"></i>
                    <h3 class="text-xl font-semibold text-gray-600 mb-2">No slides yet</h3>
                    <p class="text-gray-500 mb-4">Create your first carousel slide to get started</p>
                    <button onclick="window.carouselManager.openSlideEditor()" class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">
                        <i class="fas fa-plus mr-2"></i>Add First Slide
                    </button>
                </div>
            `;
            return;
        }

        const sortedSlides = [...this.slides].sort((a, b) => a.order_index - b.order_index);
        
        container.innerHTML = `
            <div class="mb-4 flex justify-between items-center">
                <h4 class="text-lg font-semibold text-gray-900">Manage Slides (${this.slides.length})</h4>
                <div class="flex space-x-2">
                    <button onclick="window.carouselManager.openSlideEditor()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                        <i class="fas fa-plus mr-2"></i>Add Slide
                    </button>
                    <button onclick="window.carouselManager.loadSlides()" class="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition">
                        <i class="fas fa-sync mr-2"></i>Refresh
                    </button>
                </div>
            </div>
            
            <div id="slidesList" class="space-y-4">
                ${sortedSlides.map(slide => this.renderSlideCard(slide)).join('')}
            </div>
            
            <div class="mt-6 p-4 bg-blue-50 rounded-lg">
                <h5 class="font-semibold text-blue-900 mb-2">💡 Pro Tips:</h5>
                <ul class="text-sm text-blue-800 space-y-1">
                    <li>• Drag slides to reorder them</li>
                    <li>• Use high-quality images (1200x600px recommended)</li>
                    <li>• Keep titles concise and engaging</li>
                    <li>• Test on mobile devices for best experience</li>
                </ul>
            </div>
        `;

        // Make slides sortable
        this.makeSortable();
    }

    renderSlideCard(slide) {
        return `
            <div class="slide-card bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow" data-slide-id="${slide.id}">
                <div class="flex items-start space-x-4">
                    <!-- Drag Handle -->
                    <div class="drag-handle cursor-move text-gray-400 hover:text-gray-600 pt-2">
                        <i class="fas fa-grip-vertical"></i>
                    </div>
                    
                    <!-- Slide Image -->
                    <div class="flex-shrink-0">
                        <img src="${slide.image_url}" alt="${slide.title}" 
                             class="w-24 h-16 object-cover rounded-lg border"
                             onerror="this.src='https://via.placeholder.com/150x100?text=No+Image'">
                    </div>
                    
                    <!-- Slide Info -->
                    <div class="flex-1 min-w-0">
                        <div class="flex items-start justify-between">
                            <div class="flex-1">
                                <h4 class="text-lg font-semibold text-gray-900 truncate">${slide.title}</h4>
                                <p class="text-sm text-gray-600 mt-1 line-clamp-2">${slide.description || 'No description'}</p>
                                <div class="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                    <span>Order: ${slide.order_index + 1}</span>
                                    <span>Created: ${this.formatDate(slide.created_at)}</span>
                                    ${slide.link_url ? `<span><i class="fas fa-link mr-1"></i>Has Link</span>` : ''}
                                </div>
                            </div>
                            
                            <!-- Status Toggle -->
                            <div class="flex items-center space-x-2 ml-4">
                                <label class="flex items-center cursor-pointer">
                                    <input type="checkbox" ${slide.is_active ? 'checked' : ''} 
                                           onchange="window.carouselManager.toggleSlideStatus('${slide.id}')"
                                           class="sr-only">
                                    <div class="relative">
                                        <div class="w-10 h-6 bg-gray-200 rounded-full shadow-inner transition-colors ${slide.is_active ? 'bg-green-400' : ''}"></div>
                                        <div class="absolute w-4 h-4 bg-white rounded-full shadow top-1 left-1 transition-transform ${slide.is_active ? 'transform translate-x-4' : ''}"></div>
                                    </div>
                                </label>
                                <span class="text-xs ${slide.is_active ? 'text-green-600' : 'text-gray-500'}">${slide.is_active ? 'Active' : 'Inactive'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Actions -->
                    <div class="flex flex-col space-y-2">
                        <button onclick="window.carouselManager.openSlideEditor('${slide.id}')" 
                                class="text-blue-600 hover:text-blue-800 text-sm">
                            <i class="fas fa-edit mr-1"></i>Edit
                        </button>
                        <button onclick="window.carouselManager.previewSlide('${slide.id}')" 
                                class="text-green-600 hover:text-green-800 text-sm">
                            <i class="fas fa-eye mr-1"></i>Preview
                        </button>
                        <button onclick="window.carouselManager.deleteSlide('${slide.id}')" 
                                class="text-red-600 hover:text-red-800 text-sm">
                            <i class="fas fa-trash mr-1"></i>Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // ==================== SLIDE EDITOR ====================

    openSlideEditor(slideId = null) {
        const slide = slideId ? this.slides.find(s => s.id === slideId) : null;
        const isEdit = !!slide;
        
        this.currentSlideId = slideId;
        
        const modal = this.createModal(isEdit ? 'Edit Slide' : 'Add New Slide', `
            <form id="slideEditorForm" class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Left Column -->
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Slide Title *</label>
                            <input type="text" name="title" value="${slide?.title || ''}" 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                                   placeholder="Enter slide title" required>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                            <textarea name="description" rows="3" 
                                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                                      placeholder="Enter slide description">${slide?.description || ''}</textarea>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Link URL (Optional)</label>
                            <input type="url" name="link_url" value="${slide?.link_url || ''}" 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                                   placeholder="https://example.com">
                        </div>
                        
                        <div class="flex items-center">
                            <input type="checkbox" name="is_active" ${slide?.is_active !== false ? 'checked' : ''} 
                                   class="mr-2 rounded">
                            <label class="text-sm font-medium text-gray-700">Active (show in carousel)</label>
                        </div>
                    </div>
                    
                    <!-- Right Column -->
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Slide Image *</label>
                            <div id="imageUploadArea" class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer">
                                ${slide?.image_url ? `
                                    <img id="previewImage" src="${slide.image_url}" alt="Preview" class="max-w-full h-32 object-cover mx-auto rounded-lg mb-3">
                                    <p class="text-sm text-gray-600">Click to change image</p>
                                ` : `
                                    <i class="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-3"></i>
                                    <p class="text-gray-600">Click to upload image</p>
                                    <p class="text-sm text-gray-500">Recommended: 1200x600px</p>
                                `}
                            </div>
                            <input type="hidden" name="image_url" value="${slide?.image_url || ''}" required>
                        </div>
                        
                        <div class="bg-gray-50 p-4 rounded-lg">
                            <h5 class="font-medium text-gray-900 mb-2">Image Guidelines:</h5>
                            <ul class="text-sm text-gray-600 space-y-1">
                                <li>• Recommended size: 1200x600px</li>
                                <li>• Format: JPG, PNG, WebP</li>
                                <li>• Max file size: 5MB</li>
                                <li>• High quality for best results</li>
                            </ul>
                        </div>
                    </div>
                </div>
                
                <div class="flex justify-end space-x-3 pt-6 border-t">
                    <button type="button" onclick="window.carouselManager.closeModal()" 
                            class="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
                        Cancel
                    </button>
                    <button type="submit" 
                            class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                        <i class="fas fa-save mr-2"></i>${isEdit ? 'Update' : 'Create'} Slide
                    </button>
                </div>
            </form>
        `);

        // Setup image upload
        this.setupImageUpload();
        
        // Setup form submission
        document.getElementById('slideEditorForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSlideSubmit(e.target, isEdit);
        });
    }

    setupImageUpload() {
        const uploadArea = document.getElementById('imageUploadArea');
        const imageUrlInput = document.querySelector('input[name="image_url"]');
        
        uploadArea.addEventListener('click', () => {
            if (window.workingUploadService) {
                window.workingUploadService.showUploadDialog((result) => {
                    imageUrlInput.value = result.url;
                    
                    // Update preview
                    uploadArea.innerHTML = `
                        <img id="previewImage" src="${result.url}" alt="Preview" class="max-w-full h-32 object-cover mx-auto rounded-lg mb-3">
                        <p class="text-sm text-gray-600">Click to change image</p>
                    `;
                    
                    this.showNotification('success', 'Image uploaded successfully');
                });
            } else {
                this.showNotification('error', 'Upload service not available');
            }
        });
    }

    async handleSlideSubmit(form, isEdit) {
        try {
            const formData = new FormData(form);
            const slideData = {
                title: formData.get('title'),
                description: formData.get('description'),
                image_url: formData.get('image_url'),
                link_url: formData.get('link_url'),
                is_active: formData.has('is_active')
            };

            // Validate required fields
            if (!slideData.title || !slideData.image_url) {
                this.showNotification('error', 'Title and image are required');
                return;
            }

            if (isEdit) {
                await this.updateSlide(this.currentSlideId, slideData);
            } else {
                await this.createSlide(slideData);
            }

            this.closeModal();
        } catch (error) {
            console.error('Failed to save slide:', error);
            this.showNotification('error', 'Failed to save slide');
        }
    }

    // ==================== UTILITY METHODS ====================

    async toggleSlideStatus(slideId) {
        const slide = this.slides.find(s => s.id === slideId);
        if (slide) {
            await this.updateSlide(slideId, { is_active: !slide.is_active });
        }
    }

    previewSlide(slideId) {
        const slide = this.slides.find(s => s.id === slideId);
        if (!slide) return;

        this.createModal('Slide Preview', `
            <div class="text-center">
                <img src="${slide.image_url}" alt="${slide.title}" class="max-w-full h-64 object-cover mx-auto rounded-lg mb-4">
                <h3 class="text-2xl font-bold text-gray-900 mb-2">${slide.title}</h3>
                <p class="text-gray-600 mb-4">${slide.description || 'No description'}</p>
                ${slide.link_url ? `<a href="${slide.link_url}" target="_blank" class="text-blue-600 hover:text-blue-800"><i class="fas fa-external-link-alt mr-1"></i>View Link</a>` : ''}
                <div class="mt-6 pt-4 border-t text-sm text-gray-500">
                    Status: <span class="${slide.is_active ? 'text-green-600' : 'text-red-600'}">${slide.is_active ? 'Active' : 'Inactive'}</span> | 
                    Order: ${slide.order_index + 1} | 
                    Created: ${this.formatDate(slide.created_at)}
                </div>
            </div>
        `);
    }

    makeSortable() {
        // Simple drag and drop implementation
        const slidesList = document.getElementById('slidesList');
        if (!slidesList) return;

        let draggedElement = null;

        slidesList.addEventListener('dragstart', (e) => {
            if (e.target.closest('.slide-card')) {
                draggedElement = e.target.closest('.slide-card');
                e.dataTransfer.effectAllowed = 'move';
            }
        });

        slidesList.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        slidesList.addEventListener('drop', (e) => {
            e.preventDefault();
            const targetCard = e.target.closest('.slide-card');
            
            if (targetCard && draggedElement && targetCard !== draggedElement) {
                const allCards = Array.from(slidesList.querySelectorAll('.slide-card'));
                const draggedIndex = allCards.indexOf(draggedElement);
                const targetIndex = allCards.indexOf(targetCard);
                
                if (draggedIndex < targetIndex) {
                    targetCard.parentNode.insertBefore(draggedElement, targetCard.nextSibling);
                } else {
                    targetCard.parentNode.insertBefore(draggedElement, targetCard);
                }
                
                // Update order
                const newOrder = Array.from(slidesList.querySelectorAll('.slide-card')).map(card => 
                    card.getAttribute('data-slide-id')
                );
                this.reorderSlides(newOrder);
            }
        });

        // Make cards draggable
        slidesList.querySelectorAll('.slide-card').forEach(card => {
            card.draggable = true;
        });
    }

    updateSlideCount() {
        const countElement = document.getElementById('totalCarouselImages') || document.getElementById('carouselCount');
        if (countElement) {
            countElement.textContent = this.slides.filter(s => s.is_active).length;
        }
    }

    // ==================== FRONT PAGE INTEGRATION ====================

    async updateFrontPageCarousel() {
        try {
            // Get active slides sorted by order
            const activeSlides = this.slides
                .filter(slide => slide.is_active)
                .sort((a, b) => a.order_index - b.order_index);

            // Update the front page carousel if it exists
            if (typeof window.updateCarouselSlides === 'function') {
                window.updateCarouselSlides(activeSlides);
            }

            // Also update localStorage for front page to use
            localStorage.setItem('carouselSlides', JSON.stringify(activeSlides));
            
            console.log('✅ Front page carousel updated with', activeSlides.length, 'slides');
        } catch (error) {
            console.error('Failed to update front page carousel:', error);
        }
    }

    // ==================== DATA MANAGEMENT ====================

    getMockSlides() {
        return [
            {
                id: '1',
                title: 'Welcome to My Portfolio',
                description: 'Discover my journey in product management and consulting',
                image_url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200',
                link_url: '#about',
                order_index: 0,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: '2',
                title: 'Featured Case Study',
                description: 'Explore my latest project and its impact',
                image_url: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200',
                link_url: '#case-studies',
                order_index: 1,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
        ];
    }

    saveToLocalStorage() {
        localStorage.setItem('adminCarouselSlides', JSON.stringify(this.slides));
    }

    loadFromLocalStorage() {
        const saved = localStorage.getItem('adminCarouselSlides');
        return saved ? JSON.parse(saved) : this.getMockSlides();
    }

    // ==================== UI HELPERS ====================

    createModal(title, content) {
        const modal = document.createElement('div');
        modal.id = 'carouselModal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-screen overflow-y-auto">
                <div class="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                    <h2 class="text-2xl font-bold text-gray-900">${title}</h2>
                    <button onclick="window.carouselManager.closeModal()" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times text-2xl"></i>
                    </button>
                </div>
                <div class="p-6">${content}</div>
            </div>
        `;
        
        document.body.appendChild(modal);
        return modal;
    }

    closeModal() {
        const modal = document.getElementById('carouselModal');
        if (modal) {
            modal.remove();
        }
    }

    showLoading(show) {
        const container = document.getElementById('carouselSlides');
        if (!container) return;

        if (show) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <i class="fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
                    <p class="text-gray-600">Loading carousel slides...</p>
                </div>
            `;
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

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString();
    }
}

// Initialize carousel manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.carouselManager = new CarouselManager();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CarouselManager;
}